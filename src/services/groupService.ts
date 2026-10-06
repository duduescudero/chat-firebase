import {
  DocumentData,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import type { ChatGroup, CreateGroupInput, UpdateGroupInput } from '../types/group';
import { NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/notification';
import { AppError } from '../utils/errors';
import { validateGroupName, validateMemberLimit } from '../utils/groupValidation';
import { syncGroupMembers } from './apiService';
import { db } from './firebase';
import { uploadImage } from './storageService';

function parsePolicy(value: unknown): NotificationPolicy {
  return NOTIFICATION_POLICIES.find((policy) => policy === value) ?? 'all_group_messages';
}

export function parseGroup(id: string, data: DocumentData): ChatGroup {
  const rawMembers: unknown = data.memberIds;
  const memberIds = Array.isArray(rawMembers)
    ? rawMembers.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Grupo',
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    memberIds,
    memberLimit: typeof data.memberLimit === 'number' ? data.memberLimit : memberIds.length,
    notificationPolicy: parsePolicy(data.notificationPolicy),
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
}

function uniqueWithOwner(ownerId: string, memberIds: readonly string[]): string[] {
  return Array.from(new Set([ownerId, ...memberIds]));
}

export async function getGroup(groupId: string): Promise<ChatGroup | null> {
  const snapshot = await getDoc(doc(db, 'groups', groupId));
  return snapshot.exists() ? parseGroup(snapshot.id, snapshot.data()) : null;
}

export function listenToGroup(
  groupId: string,
  onData: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'groups', groupId),
    (snapshot) => onData(snapshot.exists() ? parseGroup(snapshot.id, snapshot.data()) : null),
    onError,
  );
}

export function listenToGroups(
  uid: string,
  onData: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): () => void {
  const groupsQuery = query(collection(db, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    groupsQuery,
    (snapshot) => onData(snapshot.docs.map((item) => parseGroup(item.id, item.data()))),
    onError,
  );
}

export async function createGroup(input: CreateGroupInput): Promise<string> {
  const name = input.name.trim();
  const nameError = validateGroupName(name);
  if (nameError) throw new AppError(nameError);

  const memberIds = uniqueWithOwner(input.ownerId, input.memberIds);
  if (memberIds.length < 2) {
    throw new AppError('Um grupo precisa ter pelo menos dois integrantes.');
  }
  const limitError = validateMemberLimit(input.memberLimit, memberIds.length);
  if (limitError) throw new AppError(limitError);

  const groupRef = doc(collection(db, 'groups'));
  const now = Date.now();
  // As regras do Firestore revalidam tudo (limite, proprietário, política) no servidor.
  await setDoc(groupRef, {
    name,
    photoUrl: '',
    ownerId: input.ownerId,
    memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
    createdAt: now,
    updatedAt: now,
  });

  if (input.photoUri) {
    // A regra do Storage consulta o Firestore: o grupo precisa existir antes do upload.
    const photoUrl = await uploadImage(`groups/${groupRef.id}/${Date.now()}.jpg`, input.photoUri);
    await updateDoc(groupRef, { photoUrl, updatedAt: Date.now() });
  }

  await syncGroupMembers(groupRef.id);
  return groupRef.id;
}

/**
 * Atualização feita dentro de uma TRANSAÇÃO: se outra escrita alterar o grupo no meio do caminho,
 * a transação é repetida com o estado novo. Junto com a regra do Firestore (que valida o
 * documento resultante), isso impede estourar o limite em ações concorrentes.
 */
export async function updateGroup(input: UpdateGroupInput): Promise<void> {
  const name = input.name.trim();
  const nameError = validateGroupName(name);
  if (nameError) throw new AppError(nameError);

  const groupRef = doc(db, 'groups', input.groupId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(groupRef);
    if (!snapshot.exists()) throw new AppError('Grupo não encontrado.');
    const current = parseGroup(snapshot.id, snapshot.data());
    if (current.ownerId !== input.requesterId) {
      throw new AppError('Somente o proprietário pode editar o grupo.');
    }

    const memberIds = uniqueWithOwner(current.ownerId, input.memberIds);
    if (memberIds.length < 2) {
      throw new AppError('Um grupo precisa ter pelo menos dois integrantes.');
    }
    const limitError = validateMemberLimit(input.memberLimit, memberIds.length);
    if (limitError) throw new AppError(limitError);

    transaction.update(groupRef, {
      name,
      memberIds,
      memberLimit: input.memberLimit,
      notificationPolicy: input.notificationPolicy,
      updatedAt: Date.now(),
    });
  });

  if (input.photoUri) {
    const photoUrl = await uploadImage(`groups/${input.groupId}/${Date.now()}.jpg`, input.photoUri);
    await updateDoc(groupRef, { photoUrl, updatedAt: Date.now() });
  }

  await syncGroupMembers(input.groupId);
}

export async function removeMember(
  groupId: string,
  requesterId: string,
  memberId: string,
): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(groupRef);
    if (!snapshot.exists()) throw new AppError('Grupo não encontrado.');
    const current = parseGroup(snapshot.id, snapshot.data());
    if (current.ownerId !== requesterId) {
      throw new AppError('Somente o proprietário pode remover integrantes.');
    }
    if (memberId === current.ownerId) {
      throw new AppError('O proprietário não pode ser removido do grupo.');
    }
    const remaining = current.memberIds.filter((id) => id !== memberId);
    if (remaining.length < 2) {
      throw new AppError('O grupo precisa manter pelo menos dois integrantes.');
    }
    transaction.update(groupRef, { memberIds: remaining, updatedAt: Date.now() });
  });
  await syncGroupMembers(groupId);
}

export async function leaveGroup(groupId: string, uid: string): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(groupRef);
    if (!snapshot.exists()) throw new AppError('Grupo não encontrado.');
    const current = parseGroup(snapshot.id, snapshot.data());
    if (current.ownerId === uid) {
      throw new AppError('O proprietário não pode sair do grupo.');
    }
    transaction.update(groupRef, {
      memberIds: current.memberIds.filter((id) => id !== uid),
      updatedAt: Date.now(),
    });
  });
  await syncGroupMembers(groupId);
}

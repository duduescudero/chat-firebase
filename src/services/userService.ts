import {
  DocumentData,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import type { PublicProfile } from '../types/user';
import { chunk } from '../utils/validation';
import { db } from './firebase';

export function parsePublicProfile(id: string, data: DocumentData): PublicProfile {
  const name = typeof data.name === 'string' ? data.name : 'Usuário';
  return {
    uid: id,
    name,
    nameLower: typeof data.nameLower === 'string' ? data.nameLower : name.toLowerCase(),
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
  };
}

export async function listPublicProfiles(): Promise<PublicProfile[]> {
  const snapshot = await getDocs(
    query(collection(db, 'publicProfiles'), orderBy('nameLower'), limit(200)),
  );
  return snapshot.docs.map((item) => parsePublicProfile(item.id, item.data()));
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snapshot = await getDoc(doc(db, 'publicProfiles', uid));
  return snapshot.exists() ? parsePublicProfile(snapshot.id, snapshot.data()) : null;
}

/** Firestore limita o operador 'in' a 30 valores: busca em lotes. */
export async function getPublicProfiles(uids: readonly string[]): Promise<PublicProfile[]> {
  const unique = Array.from(new Set(uids));
  const batches = await Promise.all(
    chunk(unique, 30).map((ids) =>
      getDocs(query(collection(db, 'publicProfiles'), where(documentId(), 'in', ids))),
    ),
  );
  return batches.flatMap((snapshot) =>
    snapshot.docs.map((item) => parsePublicProfile(item.id, item.data())),
  );
}

export function listenToOwnPublicProfile(
  uid: string,
  onData: (profile: PublicProfile | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'publicProfiles', uid),
    (snapshot) => onData(snapshot.exists() ? parsePublicProfile(snapshot.id, snapshot.data()) : null),
    onError,
  );
}

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query as rtdbQuery,
  ref,
  serverTimestamp,
  set,
} from 'firebase/database';

import type {
  ChatMessage,
  ConversationType,
  DirectConversation,
  MessageTarget,
  SendMessageInput,
} from '../types/chat';
import { AppError } from '../utils/errors';
import { buildDirectConversationId, sortedPair } from '../utils/conversationId';
import { db, rtdb } from './firebase';

export const MAX_MESSAGE_LENGTH = 2000;

/** Cria (ou localiza) a conversa individual do par. Nunca há duas para o mesmo par. */
export async function ensureDirectConversation(myUid: string, otherUid: string): Promise<string> {
  if (myUid === otherUid) {
    throw new AppError('Você não pode iniciar uma conversa consigo mesmo.');
  }
  const conversationId = buildDirectConversationId(myUid, otherUid);
  const conversationRef = doc(db, 'directConversations', conversationId);
  const existing = await getDoc(conversationRef);
  if (!existing.exists()) {
    await setDoc(conversationRef, {
      type: 'direct',
      participantIds: sortedPair(myUid, otherUid),
      createdAt: Date.now(),
    });
  }
  return conversationId;
}

export function listenToDirectConversations(
  uid: string,
  onData: (conversations: DirectConversation[]) => void,
  onError: (error: Error) => void,
): () => void {
  const conversationsQuery = query(
    collection(db, 'directConversations'),
    where('participantIds', 'array-contains', uid),
  );
  return onSnapshot(
    conversationsQuery,
    (snapshot) => {
      const conversations: DirectConversation[] = [];
      snapshot.docs.forEach((item) => {
        const data = item.data();
        const ids: unknown = data.participantIds;
        if (Array.isArray(ids) && ids.length === 2 && ids.every((id) => typeof id === 'string')) {
          conversations.push({
            id: item.id,
            type: 'direct',
            participants: [ids[0] as string, ids[1] as string],
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
          });
        }
      });
      onData(conversations);
    },
    onError,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }
  return { type: 'conversation' };
}

function parseStringList(value: unknown): string[] {
  const items: unknown[] = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];
  return items.filter((item): item is string => typeof item === 'string');
}

function parseMessage(id: string, conversationId: string, value: unknown): ChatMessage | null {
  if (!isRecord(value)) return null;
  if (typeof value.senderId !== 'string' || typeof value.text !== 'string') return null;
  const type: ConversationType = value.conversationType === 'group' ? 'group' : 'direct';
  return {
    id,
    conversationId,
    conversationType: type,
    senderId: value.senderId,
    text: value.text,
    target: parseTarget(value.target),
    mentionedUserIds: parseStringList(value.mentionedUserIds),
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
  };
}

/** Persiste a mensagem no Realtime Database e devolve o id gerado. */
export async function sendMessage(input: SendMessageInput): Promise<string> {
  const text = input.text.trim();
  if (text.length === 0) throw new AppError('Digite uma mensagem antes de enviar.');
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`);
  }

  const messageRef = push(ref(rtdb, `messages/${input.conversationId}`));
  const messageId = messageRef.key;
  if (!messageId) throw new AppError('Não foi possível gerar o identificador da mensagem.');

  await set(messageRef, {
    conversationId: input.conversationId,
    conversationType: input.conversationType,
    senderId: input.senderId,
    text,
    target: input.target,
    mentionedUserIds: input.mentionedUserIds,
    createdAt: serverTimestamp(),
  });
  return messageId;
}

/**
 * Listener em tempo real das últimas mensagens da conversa.
 * Devolve a função que REMOVE o listener (chamar no cleanup do useEffect).
 */
export function listenToMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): () => void {
  const messagesQuery = rtdbQuery(
    ref(rtdb, `messages/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(200),
  );
  return onValue(
    messagesQuery,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((child) => {
        const message = parseMessage(child.key ?? '', conversationId, child.val());
        if (message) messages.push(message);
      });
      onData(messages);
    },
    onError,
  );
}

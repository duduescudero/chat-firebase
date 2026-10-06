import type { UserProfileResponse } from '../types/user';
import { AppError } from '../utils/errors';
import { auth } from './firebase';

const API_URL: string = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

type ErrorBody = { error?: string };

async function authorizedRequest<T>(path: string, method: 'GET' | 'POST', body?: object): Promise<T> {
  if (API_URL.length === 0) {
    throw new AppError('A URL da API não está configurada (EXPO_PUBLIC_API_URL).');
  }
  const currentUser = auth.currentUser;
  if (!currentUser) throw new AppError('Sua sessão expirou. Entre novamente.');

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = 'Falha na comunicação com o servidor.';
    try {
      const data = (await response.json()) as ErrorBody;
      if (typeof data.error === 'string') message = data.error;
    } catch {
      // corpo não era JSON: mantém a mensagem padrão
    }
    throw new AppError(message);
  }
  return (await response.json()) as T;
}

/** Pede à API o envio do push. A API calcula os destinatários; o app não envia lista. */
export async function requestMessageNotification(
  conversationId: string,
  messageId: string,
): Promise<void> {
  await authorizedRequest<{ ok: boolean }>('/notifications/messages', 'POST', {
    conversationId,
    messageId,
  });
}

/** Espelha os integrantes do grupo (Firestore) no Realtime Database, usado nas regras de leitura. */
export async function syncGroupMembers(groupId: string): Promise<void> {
  await authorizedRequest<{ ok: boolean }>(`/groups/${encodeURIComponent(groupId)}/sync-members`, 'POST');
}

/** Perfil completo: a API só entrega e-mail/celular/nascimento se houver conversa ou grupo em comum. */
export async function fetchUserProfile(uid: string): Promise<UserProfileResponse> {
  return authorizedRequest<UserProfileResponse>(`/users/${encodeURIComponent(uid)}/profile`, 'GET');
}

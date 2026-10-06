import type { ConversationType, MessageTarget, NotificationPolicy } from '../types';

export type RecipientInput = {
  conversationType: ConversationType;
  senderId: string;
  /** Conversa individual: os dois participantes. */
  directParticipants?: string[];
  /** Grupo: integrantes e política (lidos do Firestore, nunca do cliente). */
  group?: { memberIds: string[]; notificationPolicy: NotificationPolicy };
  target: MessageTarget;
  mentionedUserIds: string[];
};

export type RecipientResult = {
  recipients: string[];
  /** Quem foi citado/selecionado explicitamente (muda o texto do push). */
  directlyAddressed: string[];
};

/**
 * Calcula, NO SERVIDOR, quem recebe o push.
 *
 * - Individual: o outro participante, sempre.
 * - Grupo:
 *   - all_group_messages: mensagem geral → todos; mensagem direcionada → só os citados.
 *   - mentioned_members: apenas citados/selecionados (mensagem geral não notifica ninguém).
 *   - direct_messages_only e disabled: ninguém.
 * - O remetente nunca recebe; só participantes da conversa podem receber.
 */
export function resolveRecipients(input: RecipientInput): RecipientResult {
  const { senderId, conversationType } = input;

  if (conversationType === 'direct') {
    const participants = input.directParticipants ?? [];
    const recipients = participants.filter((uid) => uid !== senderId);
    return { recipients: unique(recipients), directlyAddressed: [] };
  }

  const group = input.group;
  if (!group) return { recipients: [], directlyAddressed: [] };

  const members = group.memberIds;
  const addressed = unique([
    ...input.mentionedUserIds,
    ...(input.target.type === 'member' ? [input.target.memberId] : []),
  ]).filter((uid) => uid !== senderId && members.includes(uid));

  switch (group.notificationPolicy) {
    case 'all_group_messages': {
      if (input.target.type === 'conversation') {
        return {
          recipients: unique(members.filter((uid) => uid !== senderId)),
          directlyAddressed: addressed,
        };
      }
      return { recipients: addressed, directlyAddressed: addressed };
    }
    case 'mentioned_members':
      return { recipients: addressed, directlyAddressed: addressed };
    case 'direct_messages_only':
    case 'disabled':
    default:
      return { recipients: [], directlyAddressed: [] };
  }
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

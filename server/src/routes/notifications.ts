import { Router, type Request, type Response } from 'express';

import { authenticate, getUid } from '../middleware/authenticate';
import { adminDb, adminRtdb } from '../services/firebaseAdmin';
import { sendPushMessages, type PushMessage, type PushTarget } from '../services/notificationSender';
import { resolveRecipients } from '../services/recipientResolver';
import type { GroupData, MessageTarget, NotificationPolicy, StoredMessage } from '../types';

export const notificationsRouter = Router();

const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/;
const POLICIES: NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

type Body = { conversationId?: unknown; messageId?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  const items: unknown[] = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];
  return items.filter((item): item is string => typeof item === 'string');
}

function parseStoredMessage(value: unknown): StoredMessage | null {
  if (!isRecord(value)) return null;
  if (typeof value.senderId !== 'string' || typeof value.text !== 'string') return null;
  const target: MessageTarget =
    isRecord(value.target) && value.target.type === 'member' && typeof value.target.memberId === 'string'
      ? { type: 'member', memberId: value.target.memberId }
      : { type: 'conversation' };
  return {
    conversationId: String(value.conversationId ?? ''),
    conversationType: value.conversationType === 'group' ? 'group' : 'direct',
    senderId: value.senderId,
    text: value.text,
    target,
    mentionedUserIds: stringList(value.mentionedUserIds),
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
  };
}

function parseGroup(data: Record<string, unknown>): GroupData {
  const policy = POLICIES.find((item) => item === data.notificationPolicy) ?? 'disabled';
  return {
    name: typeof data.name === 'string' ? data.name : 'Grupo',
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
    memberIds: stringList(data.memberIds),
    memberLimit: typeof data.memberLimit === 'number' ? data.memberLimit : 0,
    notificationPolicy: policy,
  };
}

/**
 * POST /notifications/messages
 * Authorization: Bearer <firebase-id-token>
 * { "conversationId": "...", "messageId": "..." }
 */
notificationsRouter.post('/messages', authenticate, async (req: Request, res: Response) => {
  const uid = getUid(res);
  const body = (isRecord(req.body) ? req.body : {}) as Body;
  const { conversationId, messageId } = body;

  if (
    typeof conversationId !== 'string' ||
    typeof messageId !== 'string' ||
    !SAFE_ID.test(conversationId) ||
    !SAFE_ID.test(messageId)
  ) {
    res.status(400).json({ error: 'conversationId e messageId são obrigatórios.' });
    return;
  }

  try {
    // 1) A mensagem precisa existir no Realtime Database e ser do usuário autenticado.
    const snapshot = await adminRtdb.ref(`messages/${conversationId}/${messageId}`).get();
    const message = snapshot.exists() ? parseStoredMessage(snapshot.val()) : null;
    if (!message) {
      res.status(404).json({ error: 'Mensagem não encontrada.' });
      return;
    }
    if (message.senderId !== uid) {
      res.status(403).json({ error: 'Você não é o autor desta mensagem.' });
      return;
    }

    // 2) Participantes e política vêm do Firestore (nunca do app).
    let directParticipants: string[] | undefined;
    let group: GroupData | undefined;
    let conversationTitle = '';

    if (conversationId.includes('_')) {
      const participants = conversationId.split('_');
      if (message.conversationType !== 'direct' || participants.length !== 2 || !participants.includes(uid)) {
        res.status(403).json({ error: 'Você não participa desta conversa.' });
        return;
      }
      directParticipants = participants;
    } else {
      const groupSnapshot = await adminDb.collection('groups').doc(conversationId).get();
      const groupData = groupSnapshot.data();
      if (!groupSnapshot.exists || !groupData) {
        res.status(404).json({ error: 'Grupo não encontrado.' });
        return;
      }
      group = parseGroup(groupData);
      if (message.conversationType !== 'group' || !group.memberIds.includes(uid)) {
        res.status(403).json({ error: 'Você não participa deste grupo.' });
        return;
      }
      conversationTitle = group.name;
    }

    // 3) Idempotência: a mesma mensagem nunca gera dois pushes (create falha se já existir).
    const logRef = adminDb.collection('notificationLog').doc(`${conversationId}_${messageId}`);
    try {
      await logRef.create({ senderId: uid, createdAt: Date.now() });
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
      if (code === 6 || code === 'already-exists') {
        res.status(200).json({ ok: true, duplicate: true, sent: 0 });
        return;
      }
      throw error;
    }

    try {
      // 4) Destinatários calculados no servidor conforme a política.
      const { recipients, directlyAddressed } = resolveRecipients({
        conversationType: message.conversationType,
        senderId: uid,
        directParticipants,
        group,
        target: message.target,
        mentionedUserIds: message.mentionedUserIds,
      });

      if (recipients.length === 0) {
        res.status(200).json({ ok: true, sent: 0, recipients: 0 });
        return;
      }

      const senderProfile = await adminDb.collection('publicProfiles').doc(uid).get();
      const senderName = String(senderProfile.data()?.name ?? 'Alguém');

      // 5) Tokens ativos dos destinatários.
      const deviceSnapshots = await Promise.all(
        recipients.map((recipientUid) =>
          adminDb
            .collection('users')
            .doc(recipientUid)
            .collection('devices')
            .where('enabled', '==', true)
            .get(),
        ),
      );

      const messages: PushMessage[] = [];
      deviceSnapshots.forEach((devices, index) => {
        const recipientUid = recipients[index];
        const addressed = directlyAddressed.includes(recipientUid);
        devices.docs.forEach((device) => {
          const token = device.data().token;
          if (typeof token !== 'string' || token.length === 0) return;
          const target: PushTarget = { uid: recipientUid, deviceId: device.id, token };
          messages.push({
            target,
            // Sem o texto da mensagem: evita expor conteúdo na tela bloqueada.
            title: group ? conversationTitle : senderName,
            body: group
              ? addressed
                ? `${senderName} mencionou você`
                : `${senderName} enviou uma mensagem`
              : 'Nova mensagem',
            data: {
              conversationId,
              conversationType: message.conversationType,
              messageId,
            },
          });
        });
      });

      // 6) Envio e limpeza de tokens inválidos.
      const report = await sendPushMessages(messages);
      await Promise.all(
        report.invalidTargets.map((target) =>
          adminDb
            .collection('users')
            .doc(target.uid)
            .collection('devices')
            .doc(target.deviceId)
            .update({ enabled: false, updatedAt: Date.now() })
            .catch(() => undefined),
        ),
      );

      res.status(200).json({
        ok: true,
        recipients: recipients.length,
        devices: messages.length,
        sent: report.sent,
        invalidTokens: report.invalidTargets.length,
      });
    } catch (sendError) {
      // Falha de envio: libera a marca para permitir nova tentativa.
      await logRef.delete().catch(() => undefined);
      throw sendError;
    }
  } catch (error) {
    console.error('Falha ao processar notificação:', error);
    res.status(500).json({ error: 'Não foi possível enviar a notificação agora.' });
  }
});

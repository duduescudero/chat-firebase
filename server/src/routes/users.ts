import { Router, type Request, type Response } from 'express';

import { authenticate, getUid } from '../middleware/authenticate';
import { adminDb } from '../services/firebaseAdmin';

export const usersRouter = Router();

const SAFE_ID = /^[A-Za-z0-9]{1,128}$/;

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

async function sharesConversation(requesterId: string, targetId: string): Promise<boolean> {
  // Conversa individual (id = uid ordenados).
  const directId = [requesterId, targetId].sort().join('_');
  const direct = await adminDb.collection('directConversations').doc(directId).get();
  if (direct.exists) return true;

  // Grupo em comum.
  const groups = await adminDb
    .collection('groups')
    .where('memberIds', 'array-contains', requesterId)
    .get();
  return groups.docs.some((group) => {
    const members: unknown = group.data().memberIds;
    return Array.isArray(members) && members.includes(targetId);
  });
}

/**
 * GET /users/:uid/profile
 * Dados cadastrais (e-mail, celular, nascimento) só para o próprio usuário ou para quem
 * compartilha uma conversa individual ou um grupo com ele.
 */
usersRouter.get('/:uid/profile', authenticate, async (req: Request, res: Response) => {
  const requesterId = getUid(res);
  const targetId = req.params.uid;
  if (!SAFE_ID.test(targetId)) {
    res.status(400).json({ error: 'Usuário inválido.' });
    return;
  }

  try {
    if (targetId !== requesterId && !(await sharesConversation(requesterId, targetId))) {
      res.status(403).json({
        error: 'Você só pode ver o perfil de quem compartilha uma conversa ou um grupo com você.',
      });
      return;
    }

    const snapshot = await adminDb.collection('users').doc(targetId).get();
    const data = snapshot.data();
    if (!snapshot.exists || !data) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    res.status(200).json({
      uid: targetId,
      name: text(data.name) ?? 'Usuário',
      photoUrl: text(data.photoUrl) ?? '',
      email: text(data.email),
      phoneNumber: text(data.phoneNumber),
      birthDate: text(data.birthDate),
    });
  } catch (error) {
    console.error('Falha ao buscar perfil:', error);
    res.status(500).json({ error: 'Não foi possível carregar o perfil agora.' });
  }
});

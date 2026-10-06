import { Router, type Request, type Response } from 'express';

import { authenticate } from '../middleware/authenticate';
import { adminDb, adminRtdb } from '../services/firebaseAdmin';

export const groupsRouter = Router();

const SAFE_ID = /^[A-Za-z0-9]{1,64}$/;

/**
 * POST /groups/:groupId/sync-members
 *
 * As regras do Realtime Database não conseguem ler o Firestore. Esta rota copia a lista de
 * integrantes (fonte da verdade: Firestore) para /groupMembers/{groupId}, que as regras usam
 * para decidir quem lê/escreve mensagens. Idempotente: sempre espelha o estado atual.
 */
groupsRouter.post('/:groupId/sync-members', authenticate, async (req: Request, res: Response) => {
  const groupId = req.params.groupId;
  if (!SAFE_ID.test(groupId)) {
    res.status(400).json({ error: 'Identificador de grupo inválido.' });
    return;
  }
  try {
    const snapshot = await adminDb.collection('groups').doc(groupId).get();
    const data = snapshot.data();
    const memberRef = adminRtdb.ref(`groupMembers/${groupId}`);

    if (!snapshot.exists || !data || !Array.isArray(data.memberIds)) {
      await memberRef.remove();
      res.status(200).json({ ok: true, members: 0 });
      return;
    }

    const members: Record<string, boolean> = {};
    (data.memberIds as unknown[]).forEach((id) => {
      if (typeof id === 'string') members[id] = true;
    });
    await memberRef.set(members);
    res.status(200).json({ ok: true, members: Object.keys(members).length });
  } catch (error) {
    console.error('Falha ao sincronizar integrantes:', error);
    res.status(500).json({ error: 'Não foi possível sincronizar os integrantes do grupo.' });
  }
});

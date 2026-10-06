import type { NextFunction, Request, Response } from 'express';

import { adminAuth } from '../services/firebaseAdmin';

/** Valida o Firebase ID Token (Authorization: Bearer ...) e expõe o uid em res.locals.uid. */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('Authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) {
    res.status(401).json({ error: 'Token de autenticação ausente.' });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    res.locals.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada. Entre novamente.' });
  }
}

export function getUid(res: Response): string {
  return String(res.locals.uid);
}

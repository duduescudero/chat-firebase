import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { groupsRouter } from './routes/groups';
import { notificationsRouter } from './routes/notifications';
import { usersRouter } from './routes/users';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '16kb' }));

// Health check: use para verificar se a API está no ar (também usado pela hospedagem).
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'chat-firebase-push-api', time: new Date().toISOString() });
});

app.use('/notifications', notificationsRouter);
app.use('/groups', groupsRouter);
app.use('/users', usersRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

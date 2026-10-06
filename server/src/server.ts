import { app } from './app';

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`API de notificações no ar na porta ${port}`);
});

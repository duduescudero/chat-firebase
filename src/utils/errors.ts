import { FirebaseError } from 'firebase/app';

/** Erro de regra de negócio, com mensagem já amigável para o usuário. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

const FIREBASE_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
  'auth/user-token-expired': 'Sua sessão expirou. Entre novamente.',
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  PERMISSION_DENIED: 'Você não tem permissão para realizar esta ação.',
  unavailable: 'Serviço indisponível. Verifique sua conexão.',
  'storage/unauthorized': 'Sem permissão para enviar a imagem.',
  'storage/canceled': 'Envio da imagem cancelado.',
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof FirebaseError) {
    return FIREBASE_MESSAGES[error.code] ?? 'Ocorreu um erro inesperado. Tente novamente.';
  }
  if (error instanceof Error && /network request failed/i.test(error.message)) {
    return 'Sem conexão. Verifique sua internet.';
  }
  // Realtime Database sinaliza permissão negada pela mensagem do erro.
  if (error instanceof Error && /permission[_ ]denied/i.test(error.message)) {
    return 'Você não tem permissão para acessar este conteúdo.';
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

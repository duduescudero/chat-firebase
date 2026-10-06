import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

/**
 * Aceita a chave em vários formatos colados no painel da hospedagem:
 * com "\\n" literais, com quebras de linha reais, com aspas externas e com vírgula no final.
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim().replace(/,$/, '').trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, '\n').replace(/\r/g, '').trim();
  if (!key.includes('-----BEGIN PRIVATE KEY-----') || !key.includes('-----END PRIVATE KEY-----')) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY inválida: copie o valor inteiro, de -----BEGIN PRIVATE KEY----- até -----END PRIVATE KEY-----.',
    );
  }
  return `${key}\n`;
}

function createApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    credential: cert({
      projectId: requireEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: normalizePrivateKey(requireEnv('FIREBASE_PRIVATE_KEY')),
    }),
    databaseURL: requireEnv('FIREBASE_DATABASE_URL'),
  });
}

const app = createApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminRtdb = getDatabase(app);
export const adminMessaging = getMessaging(app);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuração do SDK cliente (não contém segredos administrativos).
import firebaseConfig from '../../firebaseConfig.json';

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createAuth(): Auth {
  try {
    // Persistência da sessão em AsyncStorage (recuperação de sessão ao reabrir o app).
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Fast Refresh: o Auth já foi inicializado.
    return getAuth(app);
  }
}

export const auth: Auth = createAuth();
export const db = getFirestore(app); // Cloud Firestore: perfis, grupos, tokens, políticas
export const rtdb = getDatabase(app); // Realtime Database: mensagens
export const storage = getStorage(app); // Firebase Storage: fotos

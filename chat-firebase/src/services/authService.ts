import {
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';

import type { RegisterInput } from '../types/user';
import { auth, db } from './firebase';
import { uploadImage } from './storageService';

export type RegisterResult = { photoFailed: boolean };

export async function registerWithEmail(input: RegisterInput): Promise<RegisterResult> {
  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const uid = credential.user.uid;

  try {
    let photoUrl = '';
    let photoFailed = false;
    if (input.photoUri) {
      try {
        photoUrl = await uploadImage(`profiles/${uid}/${Date.now()}.jpg`, input.photoUri);
      } catch {
        photoFailed = true; // o cadastro continua com a imagem padrão
      }
    }

    const name = input.name.trim();
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid), {
      uid,
      name,
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber.trim(),
      birthDate: input.birthDate.trim(),
      photoUrl,
      createdAt: Date.now(),
    });
    batch.set(doc(db, 'publicProfiles', uid), {
      uid,
      name,
      nameLower: name.toLowerCase(),
      photoUrl,
    });
    await batch.commit();
    return { photoFailed };
  } catch (error) {
    // Evita conta "sem perfil" quando a gravação falha.
    await deleteUser(credential.user).catch(() => undefined);
    throw error;
  }
}

export async function loginWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function observeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

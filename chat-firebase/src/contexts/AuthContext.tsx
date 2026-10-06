import type { User } from 'firebase/auth';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { loginWithEmail, logout, observeAuth, registerWithEmail, type RegisterResult } from '../services/authService';
import { unregisterDevice } from '../services/notificationService';
import { listenToOwnPublicProfile } from '../services/userService';
import type { PublicProfile, RegisterInput } from '../types/user';

export type AuthContextValue = {
  user: User | null;
  profile: PublicProfile | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<RegisterResult>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type Props = { children: ReactNode };

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  // Recupera a sessão persistida e observa mudanças de autenticação.
  useEffect(() => {
    return observeAuth((firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
  }, []);

  const uid = user?.uid ?? null;

  // Perfil público do usuário logado (aparece após o cadastro gravar os documentos).
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return undefined;
    }
    return listenToOwnPublicProfile(uid, setProfile, () => setProfile(null));
  }, [uid]);

  const signIn = useCallback(async (email: string, password: string) => {
    await loginWithEmail(email, password);
  }, []);

  const signUp = useCallback((input: RegisterInput) => registerWithEmail(input), []);

  const signOut = useCallback(async () => {
    if (uid) {
      // Remove o token deste aparelho antes de encerrar a sessão.
      await unregisterDevice(uid).catch(() => undefined);
    }
    await logout();
    // Os listeners são removidos quando as telas protegidas desmontam (cleanup dos useEffect).
    setProfile(null);
  }, [uid]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, initializing, signIn, signUp, signOut }),
    [user, profile, initializing, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

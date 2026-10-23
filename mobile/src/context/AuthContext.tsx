import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { login, register, setUnauthorizedHandler, type AuthResponse, type AuthUser } from '@/api';
import { clearReminders } from '@/services/reminders';
import { clearToken, saveToken } from '@/utils/token-storage';

import { restoreSession } from './restoreSession';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signOut = useCallback(async () => {
    await clearToken();
    await clearReminders(); // the next person on this phone must not get this patient's reminders
    setUser(null);
  }, []);

  // Any request the server rejects with 401/403 ends up here, from any screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .catch(() => null)
      .then((restored) => {
        if (cancelled) return;
        setUser(restored);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function startSession(result: AuthResponse) {
    await saveToken(result.token);
    setUser(result.user);
  }

  const signIn: AuthContextValue['signIn'] = async (email, password) =>
    startSession(await login(email, password));

  const signUp: AuthContextValue['signUp'] = async (email, password, firstName, lastName) =>
    startSession(await register(email, password, firstName, lastName));

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

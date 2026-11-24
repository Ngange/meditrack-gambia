import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { setUnauthorizedHandler, type AuthUser } from '@/api';
import { bindSession, session } from '@/offline/appSession';
import { clearReminders } from '@/services/reminders';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  /** True when the account was opened without a connection (the saved password check, not the server). */
  openedOffline: boolean;
  /** The saved data could not be opened and was replaced by an empty copy that is downloading again. */
  recovered: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const toUser = (a: { userId: string; email: string }): AuthUser => ({ userId: a.userId, email: a.email, role: 'patient' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openedOffline, setOpenedOffline] = useState(false);
  const [recovered, setRecovered] = useState(false);

  // Signing out keeps the account's data on the phone (encrypted); only the login and reminders go.
  const signOut = useCallback(async () => {
    await session.signOut();
    await bindSession();
    await clearReminders(); // the next person on this phone must not get this patient's reminders
    setOpenedOffline(false);
    setUser(null);
  }, []);

  // A request the server rejects with 401/403 (a revoked or tampered login) ends up here, from any screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // The app opens straight from what is saved on the phone: no connection is needed to get in.
  useEffect(() => {
    let cancelled = false;
    session
      .restore()
      .catch(() => null)
      .then(async (restored) => {
        await bindSession();
        if (cancelled) return;
        if (restored) {
          setUser(toUser(restored.account));
          setRecovered(restored.recovered);
        }
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function opened(outcome: Awaited<ReturnType<typeof session.signIn>>) {
    await bindSession();
    setOpenedOffline(outcome.mode === 'offline');
    setRecovered(outcome.recovered);
    setUser(toUser(outcome.account));
  }

  const signIn: AuthContextValue['signIn'] = async (email, password) => opened(await session.signIn(email, password));

  const signUp: AuthContextValue['signUp'] = async (email, password, firstName, lastName) =>
    opened(await session.signUp(email, password, firstName, lastName));

  return (
    <AuthContext.Provider value={{ user, isLoading, openedOffline, recovered, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

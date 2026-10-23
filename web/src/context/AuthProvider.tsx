import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { login, register } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import type { AuthUser, Role } from '../types/auth';
import { clearToken, getToken, saveToken } from '../utils/token-storage';
import { AuthContext, type AuthContextValue } from './auth-context';

// Rebuilds the signed-in user from the saved token, or null if there is none or it has expired.
// (The token holds the id and role only, so the email is unknown until the profile loads.)
function readUserFromToken(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const decoded = jwtDecode<{ userId: string; role: Role; exp: number }>(token);
    if (decoded.exp * 1000 < Date.now()) {
      clearToken();
      return null;
    }
    return { userId: decoded.userId, role: decoded.role, email: '' };
  } catch {
    clearToken();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readUserFromToken);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  // Any signed-in request the server rejects with 401/403 signs the user out, whichever page made it.
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signOut,
      async signIn(email, password) {
        const result = await login(email, password);
        saveToken(result.token);
        setUser(result.user);
      },
      async signUp(email, password, firstName, lastName) {
        const result = await register(email, password, firstName, lastName);
        saveToken(result.token);
        setUser(result.user);
      },
    }),
    [user, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

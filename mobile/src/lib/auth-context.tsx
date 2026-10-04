import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { jwtDecode } from 'jwt-decode';
import { login as apiLogin, register as apiRegister, type LoginResponse } from "@/lib/api";
import { clearToken, getToken, saveToken } from "@/lib/auth-storage";

type User = LoginResponse["user"];

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
    getToken().then((token) => {
      if (token) {
        try {
          const decoded = jwtDecode<{ userId: string; role: 'patient' | 'admin'; exp: number }>(token);

          if (decoded.exp * 1000 < Date.now()) {
            clearToken();
          } else {
            // Payload doesn't include email — fine for now, since nothing
            // reads user.email before a fresh login happens. Revisit if that changes.
            setUser({ userId: decoded.userId, role: decoded.role, email: '' });
          }
        } catch {
          clearToken();
        }
      }
      setIsLoading(false);
    });
  }, []);

  async function signIn(email: string, password: string) {
    const result = await apiLogin(email, password);
    await saveToken(result.token);
    setUser(result.user);
  }

  async function signUp(email: string, password: string, firstName: string, lastName: string) {
    const result = await apiRegister(email, password, firstName, lastName);
    await saveToken(result.token);
    setUser(result.user);
  }

  async function signOut() {
    await clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
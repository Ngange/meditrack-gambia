import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { jwtDecode } from "jwt-decode";

import { login as apiLogin, register as apiRegister, getProfile, type LoginResponse, type Profile } from "@/lib/api";
import { clearToken, getToken, saveToken } from "@/lib/auth-storage";

type User = LoginResponse["user"];

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      let decoded: { userId: string; role: "patient" | "admin"; exp: number };
      try {
        decoded = jwtDecode(token);
      } catch {
        // Malformed token — can't even be read. Genuinely invalid.
        await clearToken();
        setIsLoading(false);
        return;
      }

      if (decoded.exp * 1000 < Date.now()) {
        await clearToken();
        setIsLoading(false);
        return;
      }

      try {
        // Decoding only proves the token is well-formed and unexpired.
        // This call is what actually proves it to the server — a tampered
        // or revoked token fails here even if it passed the checks above.
        const { profile } = await getProfile(token);
        setUser({ userId: decoded.userId, role: decoded.role, email: "" });
        setProfile(profile);
      } catch (err) {
          const status = (err as any).status;
          if (status === 401 || status === 403) {
            // The server actively rejected this token — it's genuinely invalid.
            await clearToken();
          } else {
            // Offline, a server hiccup, or a missing profile is not proof the
            // token is bad — keep the patient signed in.
            setUser({ userId: decoded.userId, role: decoded.role, email: "" });
          }
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
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
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
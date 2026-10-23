import { jwtDecode } from 'jwt-decode';

import { getProfile, isAuthError, type AuthUser } from '@/api';
import { clearToken, getToken } from '@/utils/token-storage';

/**
 * Works out who is signed in when the app starts, from the token saved on the phone.
 * Returns null when there is no usable session.
 */
export async function restoreSession(): Promise<AuthUser | null> {
  const token = await getToken();
  if (!token) return null;

  let decoded: { userId: string; role: AuthUser['role']; exp: number };
  try {
    decoded = jwtDecode(token);
  } catch {
    // Malformed token: it can't even be read.
    await clearToken();
    return null;
  }

  if (decoded.exp * 1000 < Date.now()) {
    await clearToken();
    return null;
  }

  const user: AuthUser = { userId: decoded.userId, role: decoded.role, email: '' };

  try {
    // Decoding only proves the token is well-formed and unexpired. This call is what proves
    // it to the server: a tampered or revoked token fails here.
    await getProfile();
  } catch (err) {
    if (isAuthError(err)) {
      await clearToken();
      return null;
    }
    // Offline, a server hiccup, or a missing profile is not proof the token is bad,
    // so the patient stays signed in.
  }
  return user;
}

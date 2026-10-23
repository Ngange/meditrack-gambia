import { API_URL, REQUEST_TIMEOUT_MS } from '@/config/env';
import { getToken } from '@/utils/token-storage';

export class ApiError extends Error {
  status: number;
  isNetworkError: boolean;

  constructor(message: string, status: number, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

export function isAuthError(err: unknown) {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

// One place decides what happens when the server rejects the saved token:
// AuthProvider registers its signOut here, so no screen has to handle 401/403 itself.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Attach the saved token. Login and register switch this off. */
  auth?: boolean;
};

export async function request<T>(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (!token) {
      onUnauthorized?.();
      throw new ApiError('Please log in again.', 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection.', 0, true);
  } finally {
    clearTimeout(timer);
  }

  // A proxy or crashed server can answer with something that is not JSON.
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (auth && (res.status === 401 || res.status === 403)) onUnauthorized?.();
    const message = (data as { error?: string } | null)?.error || 'Something went wrong. Please try again.';
    throw new ApiError(message, res.status);
  }

  return data as T;
}

import { getToken } from '../utils/token-storage';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL is not set. Check web/.env');
}

// An error from the API (or from reaching it). status is 0 when the server could not be reached.
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isAuthError(err: unknown) {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

// Called when a signed-in request is rejected with 401/403, so the app can sign the user out.
// The AuthProvider registers it; no page has to deal with expired sessions itself.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** For code that talks to the server without `request` (file downloads). */
export function notifyUnauthorized() {
  onUnauthorized?.();
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** A plain object is sent as JSON; FormData (file uploads) is sent as-is. */
  body?: unknown;
  /** Send the saved token. Turn off for login and register. */
  auth?: boolean;
};

export async function request<T>(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}): Promise<T> {
  const isForm = body instanceof FormData;
  // For FormData the browser sets the Content-Type itself, including the multipart boundary.
  const headers: Record<string, string> = isForm ? {} : { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getToken();
    if (!token) {
      onUnauthorized?.();
      throw new ApiError('You are signed out. Please log in again.', 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    if (auth && (res.status === 401 || res.status === 403)) onUnauthorized?.();
    const message = (data as { error?: string } | null)?.error || 'Something went wrong. Please try again.';
    throw new ApiError(message, res.status);
  }

  return data as T;
}

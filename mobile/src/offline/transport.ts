import { SyncAuthError, SyncNetworkError, type SyncRequest, type SyncResponse, type Transport } from './types';

/**
 * The real connection to the server. `getToken` returns a valid login token (renewing it with the phone's
 * device key when needed) or throws SyncAuthError. A 401/403 from the server is never reported to the app's
 * global sign-out: syncing is in the background and must not close the patient's session.
 */
export function createHttpTransport(opts: {
  baseUrl: string;
  getToken: () => Promise<string>;
  /** Called when the server refuses the token, so the next call fetches a fresh one. */
  tokenRefused?: () => void;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Transport {
  const doFetch = opts.fetchImpl ?? fetch;
  return {
    async sync(req: SyncRequest): Promise<SyncResponse> {
      const token = await opts.getToken();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45_000);
      let res: Response;
      try {
        res = await doFetch(`${opts.baseUrl}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(req),
          signal: controller.signal,
        });
      } catch {
        throw new SyncNetworkError();
      } finally {
        clearTimeout(timer);
      }
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (res.status === 401 || res.status === 403) {
        opts.tokenRefused?.();
        throw new SyncAuthError();
      }
      if (!res.ok) {
        // A proxy page or a crashed server (5xx) is a connection problem as far as the patient is concerned: the changes stay queued.
        if (res.status >= 500 || res.status === 429 || data === null) throw new SyncNetworkError('The server is not answering. Your changes are saved on this phone.');
        throw new Error((data as { error?: string }).error ?? 'Sync failed.');
      }
      return data as SyncResponse;
    },
  };
}

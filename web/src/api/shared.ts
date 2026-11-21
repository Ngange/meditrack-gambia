import type { MedicalDocument, SharedView } from '../types/records';
import { ApiError, request } from './client';

const API_URL = import.meta.env.VITE_API_URL;

// Opening a link counts as a view, so one page load must be one request. In development React runs
// effects twice; sharing the in-flight request keeps that from counting as two views.
const inFlight = new Map<string, Promise<SharedView>>();

// The side of whoever holds a link: no login, the link is the key.
export const sharedApi = {
  load(token: string) {
    const existing = inFlight.get(token);
    if (existing) return existing;
    const promise = request<SharedView>(`/shared/${encodeURIComponent(token)}`, { auth: false });
    inFlight.set(token, promise);
    promise.then(
      () => setTimeout(() => inFlight.delete(token), 5000),
      () => inFlight.delete(token),
    );
    return promise;
  },

  // Fetches a shared document and saves it from the browser.
  async download(token: string, doc: MedicalDocument) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/shared/${encodeURIComponent(token)}/documents/${doc.document_id}/file`);
    } catch {
      throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new ApiError(data?.error || 'Could not download the document.', res.status);
    }
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.file_name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};

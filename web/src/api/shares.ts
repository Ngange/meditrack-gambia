import type { CreatedShare, Share, ShareInput, StandingQr } from '../types/records';
import { request } from './client';

// The patient's side: make, list and revoke share links.
export const sharesApi = {
  async list() {
    const data = await request<{ shares: Share[] }>('/shares');
    return data.shares;
  },

  create(input: ShareInput) {
    return request<CreatedShare>('/shares', { method: 'POST', body: input });
  },

  /** The permanent QR. Made the first time it is asked for, and the same address every time after. */
  standing() {
    return request<StandingQr>('/shares/standing');
  },

  /** Switches the old QR off for good and returns a new one. */
  resetStanding() {
    return request<StandingQr>('/shares/standing/reset', { method: 'POST' });
  },

  async revoke(id: string) {
    await request<{ revoked: boolean }>(`/shares/${id}`, { method: 'DELETE' });
  },
};

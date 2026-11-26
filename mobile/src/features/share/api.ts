import { request } from '@/api';

import type { CreatedShare, StandingQr, Share, ShareDuration, ShareSection } from './types';

export const shareApi = {
  async list() {
    const data = await request<{ shares: Share[] }>('/shares');
    return data.shares;
  },

  create(recordTypes: ShareSection[], duration: ShareDuration) {
    return request<CreatedShare>('/shares', { method: 'POST', body: { recordTypes, duration } });
  },

  /** The permanent QR address (made the first time it is asked for). */
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

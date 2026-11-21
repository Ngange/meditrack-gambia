import { request } from '@/api';

import type { CreatedShare, Share, ShareDuration, ShareSection } from './types';

export const shareApi = {
  async list() {
    const data = await request<{ shares: Share[] }>('/shares');
    return data.shares;
  },

  create(recordTypes: ShareSection[], duration: ShareDuration) {
    return request<CreatedShare>('/shares', { method: 'POST', body: { recordTypes, duration } });
  },

  async revoke(id: string) {
    await request<{ revoked: boolean }>(`/shares/${id}`, { method: 'DELETE' });
  },
};

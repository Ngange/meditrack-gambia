import type { CreatedShare, Share, ShareInput } from '../types/records';
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

  async revoke(id: string) {
    await request<{ revoked: boolean }>(`/shares/${id}`, { method: 'DELETE' });
  },
};

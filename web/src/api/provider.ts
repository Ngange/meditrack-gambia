import type { PatientBasics, ProviderProfile, ProviderSession } from '../types/provider';
import { request } from './client';

export const providerApi = {
  async getMe() {
    const data = await request<{ provider: ProviderProfile }>('/providers/me');
    return data.provider;
  },

  /** The doctor types the patient's code and the PIN the patient gave them. Starts one hour of access. */
  async open(code: string, pin: string) {
    const data = await request<{ session: ProviderSession }>('/provider/access', { method: 'POST', body: { code, pin } });
    return data.session;
  },

  async sessions() {
    const data = await request<{ sessions: ProviderSession[] }>('/provider/sessions');
    return data.sessions;
  },

  /** One open session and the patient's basics. */
  getSession(id: string) {
    return request<{ session: Pick<ProviderSession, 'session_id' | 'started_at' | 'expires_at'>; patient: PatientBasics }>(`/provider/sessions/${id}`);
  },

  async end(id: string) {
    await request<{ ended: boolean }>(`/provider/sessions/${id}`, { method: 'DELETE' });
  },
};

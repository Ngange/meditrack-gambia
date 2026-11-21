import type { Access, AccessHistory } from '../types/records';
import { request } from './client';

export const accessApi = {
  async get() {
    const data = await request<{ access: Access }>('/patients/me/access');
    return data.access;
  },

  async setPin(pin: string, password: string) {
    const data = await request<{ access: Access }>('/patients/me/pin', { method: 'PUT', body: { pin, password } });
    return data.access;
  },

  history() {
    return request<AccessHistory>('/patients/me/access-history');
  },

  async endSession(sessionId: string) {
    await request<null>(`/patients/me/access-sessions/${sessionId}`, { method: 'DELETE' });
  },

  async endAll() {
    const data = await request<{ ended: number }>('/patients/me/access-sessions', { method: 'DELETE' });
    return data.ended;
  },
};

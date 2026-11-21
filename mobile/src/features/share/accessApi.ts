import { request } from '@/api';

export type Access = {
  patient_code: string;
  has_pin: boolean;
  pin_set_at: string | null;
  /** Set while doctor access is locked after too many wrong PINs. */
  locked_until: string | null;
};

export type ActiveAccess = { session_id: string; doctor: string; facility: string | null; started_at: string; expires_at: string };
export type AccessEvent = {
  id: string;
  type: 'doctor_session' | 'wrong_pin' | 'share_link';
  at: string;
  title: string;
  detail: string | null;
};
export type AccessHistory = { active: ActiveAccess[]; history: AccessEvent[] };

export const accessApi = {
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

  async get() {
    const data = await request<{ access: Access }>('/patients/me/access');
    return data.access;
  },

  async setPin(pin: string, password: string) {
    const data = await request<{ access: Access }>('/patients/me/pin', { method: 'PUT', body: { pin, password } });
    return data.access;
  },
};

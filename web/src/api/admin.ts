import type {
  AdminAccount,
  ActivityEvent,
  ActivityFilters,
  AdminDecision,
  AdminOverview,
  AdminProvider,
  AdminUser,
  AdminUserDetail,
  DoctorActivity,
  SecurityFlag,
} from '../types/provider';
import { request } from './client';

const qs = (o: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const adminApi = {
  /** Every doctor, whatever their status. The page filters them into tabs. */
  async providers() {
    const data = await request<{ providers: AdminProvider[] }>('/admin/providers?status=all');
    return data.providers;
  },

  /** Verify or reject a doctor. A rejection must come with a reason. */
  async review(providerId: string, decision: 'verified' | 'rejected', note?: string) {
    await request(`/admin/providers/${providerId}`, { method: 'PATCH', body: { decision, note: note ?? '' } });
  },

  /** Every decision ever made, newest first. */
  async decisions() {
    const data = await request<{ decisions: AdminDecision[] }>('/admin/decisions');
    return data.decisions;
  },

  overview: () => request<AdminOverview>('/admin/overview'),

  /** Counts per doctor: sessions, patients, records added. Never contents. */
  async doctorActivity() {
    const data = await request<{ activity: DoctorActivity[] }>('/admin/providers-activity');
    return data.activity;
  },

  users: (f: { q?: string; role?: string; status?: string; offset?: number }) =>
    request<{ users: AdminUser[]; has_more: boolean }>(`/admin/users${qs({ ...f, limit: 25 })}`),

  user: (id: string) => request<AdminUserDetail>(`/admin/users/${id}`),

  setStatus: (id: string, status: 'active' | 'suspended', note: string) =>
    request<{ phones_signed_out: number; sessions_ended: number }>(`/admin/users/${id}/status`, { method: 'PATCH', body: { status, note } }),

  signOutPhones: (id: string, note = '') =>
    request<{ phones_signed_out: number }>(`/admin/users/${id}/revoke-devices`, { method: 'POST', body: { note } }),

  activity: (f: ActivityFilters & { offset?: number; limit?: number }) =>
    request<{ events: ActivityEvent[]; has_more: boolean }>(`/admin/activity${qs(f)}`),

  admins: async () => (await request<{ admins: AdminAccount[] }>('/admin/admins')).admins,

  createAdmin: (email: string, password: string, adminPassword: string) =>
    request('/admin/admins', { method: 'POST', body: { email, password, adminPassword } }),

  deleteUser: (id: string, email: string, note: string) =>
    request<{ deleted: boolean; documents_removed: number }>(`/admin/users/${id}`, { method: 'DELETE', body: { email, note } }),

  security: () => request<{ flags: SecurityFlag[]; thresholds: Record<string, number> }>('/admin/security'),
};

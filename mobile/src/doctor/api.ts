import { ApiError } from '@/api';
import { API_URL } from '@/config/env';

// Doctor mode is online only and kept apart from the patient's offline data: its own login token, held in
// memory (so closing the app signs the doctor out), and its own requests.

export type KindKey = 'allergies' | 'conditions' | 'visits' | 'medications' | 'lab_results';

/** Route path and reply key for each record type on the server. */
export const KIND_PATH: Record<KindKey, string> = {
  allergies: 'allergies',
  conditions: 'conditions',
  visits: 'visits',
  medications: 'medications',
  lab_results: 'lab-results',
};

export type DoctorProfile = { provider_id: string; first_name: string; last_name: string; verification_status: 'pending' | 'verified' | 'rejected' };
export type EnteredBy = { provider_id: string; name: string; facility: string | null };
export type DoctorRecord = Record<string, unknown> & { entered_by?: EnteredBy | null };
export type OpenSession = { session_id: string; started_at: string; expires_at: string; patient: { first_name: string; last_name: string; blood_group: string | null } };
export type PatientBasics = {
  first_name: string;
  last_name: string;
  blood_group: string | null;
  date_of_birth: string | null;
  gender: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};
export type DoctorDocument = { document_id: string; document_type: string; file_name: string; description: string | null; document_date: string | null; upload_date: string };

let token: string | null = null;
let onSignedOut: (() => void) | null = null;
export const setDoctorToken = (t: string | null) => {
  token = t;
};
export const setDoctorSignedOutHandler = (fn: (() => void) | null) => {
  onSignedOut = fn;
};

async function call<T>(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    if (!token) throw new ApiError('Sign in again.', 401);
    headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
  } catch {
    throw new ApiError('Unable to reach the server. Doctor mode needs a connection.', 0, true);
  } finally {
    clearTimeout(timer);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    // 401 means the login ran out. (403 can be a normal "not allowed" answer, so it is only an error message.)
    if (auth && res.status === 401) onSignedOut?.();
    throw new ApiError((data as { error?: string } | null)?.error || 'Something went wrong. Please try again.', res.status);
  }
  return data as T;
}

export const doctorApi = {
  async login(email: string, password: string) {
    const data = await call<{ token: string; user: { role: string } }>('/auth/login', 'POST', { email, password }, false);
    if (data.user.role !== 'provider') throw new ApiError('This is not a doctor account. Patients log in on the normal screen.', 400);
    setDoctorToken(data.token);
  },
  async me() {
    return (await call<{ provider: DoctorProfile }>('/providers/me')).provider;
  },
  async openByQr(secret: string) {
    return (await call<{ session: OpenSession }>('/provider/access/qr', 'POST', { token: secret })).session;
  },
  async openByPin(code: string, pin: string) {
    return (await call<{ session: OpenSession }>('/provider/access', 'POST', { code, pin })).session;
  },
  async sessions() {
    return (await call<{ sessions: OpenSession[] }>('/provider/sessions')).sessions;
  },
  getSession(sid: string) {
    return call<{ session: { session_id: string; started_at: string; expires_at: string }; patient: PatientBasics }>(`/provider/sessions/${sid}`);
  },
  async end(sid: string) {
    await call(`/provider/sessions/${sid}`, 'DELETE');
  },
  async list(sid: string, kind: KindKey) {
    const data = await call<Record<string, DoctorRecord[]>>(`/provider/sessions/${sid}/records/${KIND_PATH[kind]}`);
    return data[kind] ?? [];
  },
  async documents(sid: string) {
    return (await call<{ documents: DoctorDocument[] }>(`/provider/sessions/${sid}/records/documents`)).documents;
  },
  async save(sid: string, kind: KindKey, body: Record<string, unknown>, id?: string) {
    const base = `/provider/sessions/${sid}/records/${KIND_PATH[kind]}`;
    await call(id ? `${base}/${id}` : base, id ? 'PUT' : 'POST', body);
  },
};

/** The secret in a scanned QR: the 43-character code after /s/ in the patient's address. Anything else is not ours. */
export function secretFromScan(text: string): string | null {
  const m = /\/s\/([A-Za-z0-9_-]{43})(?:[/?#]|$)/.exec(text.trim());
  return m ? m[1] : null;
}

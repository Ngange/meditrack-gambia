export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type ProviderProfile = {
  provider_id: string;
  first_name: string;
  last_name: string;
  email: string;
  licence_number: string;
  facility_name: string;
  specialty: string | null;
  verification_status: VerificationStatus;
  verification_note: string | null;
  verified_at: string | null;
  created_at: string;
};

// ---- A doctor's open access to one patient ----------------------------------------------------

export type ProviderSession = {
  session_id: string;
  started_at: string;
  expires_at: string;
  patient: { first_name: string; last_name: string; blood_group: string | null };
};

/** What a doctor sees about the patient themselves. */
export type PatientBasics = {
  first_name: string;
  last_name: string;
  blood_group: string | null;
  date_of_birth: string | null;
  gender: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

// ---- The administrator's view -----------------------------------------------------------------

export type AdminProvider = ProviderProfile & { decided_by: string | null };

export type AdminDecision = {
  audit_id: string;
  provider_id: string;
  first_name: string;
  last_name: string;
  licence_number: string;
  admin_email: string | null;
  previous_status: VerificationStatus;
  decision: 'verified' | 'rejected';
  note: string | null;
  decided_at: string;
};

// ---- Monitoring (metadata only: who did what, when, from where. Never record contents) ----------

export type AdminOverview = {
  users: { patients: number; doctors: number; suspended: number };
  doctors: { pending: number; verified: number; rejected: number };
  live: { open_sessions: number; active_qr: number; active_links: number; phones: number; logins_24h: number; failed_logins_24h: number };
  series: { day: string; patients: number; doctors: number; logins: number; sessions: number }[];
};

export type DoctorActivity = {
  provider_id: string;
  sessions: number;
  patients: number;
  records_added: number;
  prints: number;
  last_session: string | null;
};

export type AdminUser = {
  user_id: string;
  email: string;
  role: 'patient' | 'provider';
  status: 'active' | 'suspended';
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  patient_code: string | null;
  provider_id: string | null;
  licence_number: string | null;
  verification_status: VerificationStatus | null;
  last_login: string | null;
};

export type AdminUserDetail = {
  user: AdminUser;
  logins: { success: boolean; reason: string; source: string; ip: string | null; occurred_at: string }[];
  devices?: { platform: string; device_name: string | null; last_seen_at: string | null; created_at: string; revoked_at: string | null }[];
  last_sync?: string | null;
  shares?: number;
  activity?: DoctorActivity | null;
  admin_actions: { action: string; note: string | null; occurred_at: string; admin_email: string | null }[];
};

export type ActivityEvent = {
  at: string;
  category: 'login' | 'record' | 'session' | 'pin' | 'sync' | 'admin';
  action: string;
  result: 'ok' | 'failed';
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  patient_name: string | null;
  patient_code: string | null;
  record_type: string | null;
  ip: string | null;
  detail: string | null;
  source: string | null;
};

export type ActivityFilters = { q?: string; category?: string; result?: string; from?: string; to?: string; user?: string };

export type SecurityFlag = {
  kind: string;
  severity: 'high' | 'medium' | 'info';
  title: string;
  subject: string;
  detail: string;
  at: string;
  count: number;
};

export type AdminAccount = {
  user_id: string;
  email: string;
  status: 'active' | 'suspended';
  created_at: string;
  must_change_password: boolean;
  last_login: string | null;
};

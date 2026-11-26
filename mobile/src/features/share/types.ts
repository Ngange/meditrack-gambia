// The sections a link can include. Name and blood group are always shown, so they are not listed.
export const SHARE_SECTIONS = ['allergies', 'conditions', 'medications', 'visits', 'lab_results', 'documents', 'emergency_contact'] as const;
export type ShareSection = (typeof SHARE_SECTIONS)[number];

export const SHARE_SECTION_LABELS: Record<ShareSection, string> = {
  allergies: 'Allergies',
  conditions: 'Conditions',
  medications: 'Medications',
  visits: 'Visits',
  lab_results: 'Lab results',
  documents: 'Documents',
  emergency_contact: 'Emergency contact',
};

export const SHARE_DURATIONS = ['1h', '24h', '7d'] as const;
export type ShareDuration = (typeof SHARE_DURATIONS)[number];
export const SHARE_DURATION_LABELS: Record<ShareDuration, string> = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days' };

export type ShareStatus = 'active' | 'expired' | 'revoked';

export type Share = {
  share_id: string;
  record_types: ShareSection[];
  granted_at: string;
  expires_at: string;
  revoked_at: string | null;
  status: ShareStatus;
  view_count: number;
  last_viewed_at: string | null;
};

/** The reply to making a link. The address (and its secret) is shown once and never stored. */
export type CreatedShare = { share: Share; token: string; url: string };

/** The patient's permanent QR. The address is the same every time until the patient resets it. */
export type StandingQr = { share_id: string; url: string; created_at: string; view_count: number; last_viewed_at: string | null };

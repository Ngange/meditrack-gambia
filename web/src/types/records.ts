// The shape of each record as the API returns it (snake_case), and the input we send (camelCase).
// Dates are plain "YYYY-MM-DD" text.

export type Severity = 'mild' | 'moderate' | 'severe';
export type AllergyStatus = 'active' | 'resolved';

export type Allergy = {
  allergy_id: string;
  entered_by?: EnteredBy | null;
  allergen: string;
  reaction: string | null;
  severity: Severity | null;
  status: AllergyStatus;
  created_at: string;
  updated_at: string;
};

export type AllergyInput = {
  allergen: string;
  reaction?: string;
  severity?: Severity | null;
  status?: AllergyStatus;
};

export type ConditionStatus = 'active' | 'resolved' | 'chronic';

export type Condition = {
  condition_id: string;
  entered_by?: EnteredBy | null;
  condition_name: string;
  diagnosis_date: string | null;
  status: ConditionStatus;
  notes: string | null;
  visit_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ConditionInput = {
  conditionName: string;
  diagnosisDate?: string;
  status?: ConditionStatus;
  notes?: string;
  visitId?: string | null;
};

export type Visit = {
  visit_id: string;
  entered_by?: EnteredBy | null;
  facility_name: string | null;
  visit_date: string;
  reason: string | null;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VisitInput = {
  facilityName?: string;
  visitDate: string;
  reason?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
};

export type MedicationStatus = 'active' | 'completed' | 'discontinued';

export type Medication = {
  medication_id: string;
  entered_by?: EnteredBy | null;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string;
  end_date: string | null;
  status: MedicationStatus;
  reminder_times: string[]; // "HH:MM"
  visit_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MedicationInput = {
  medicationName: string;
  dosage?: string;
  frequency?: string;
  startDate: string;
  endDate?: string;
  status?: MedicationStatus;
  reminderTimes?: string[];
  visitId?: string | null;
};

export type LabResult = {
  result_id: string;
  entered_by?: EnteredBy | null;
  test_name: string;
  test_date: string;
  result: string | null;
  reference_range: string | null;
  facility_name: string | null;
  visit_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LabPanelRow = { testName: string; result?: string; referenceRange?: string };

/** Several results from one lab visit: one date and lab, many tests. */
export type LabPanelInput = { testDate: string; facilityName?: string; visitId?: string | null; results: LabPanelRow[] };

export type LabResultInput = {
  testName: string;
  testDate: string;
  result?: string;
  referenceRange?: string;
  facilityName?: string;
  visitId?: string | null;
};

export type Summary = {
  allergies: number;
  conditions: number;
  visits: number;
  medications: number;
  lab_results: number;
  documents: number;
};

export const DOCUMENT_TYPES = ['prescription', 'lab_report', 'discharge_summary', 'medical_certificate', 'other'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  prescription: 'Prescription',
  lab_report: 'Lab report',
  discharge_summary: 'Discharge summary',
  medical_certificate: 'Medical certificate',
  other: 'Other',
};

export type MedicalDocument = {
  document_id: string;
  document_type: DocumentType;
  file_name: string;
  description: string | null;
  /** The date on the document itself (YYYY-MM-DD); null for older uploads. */
  document_date: string | null;
  visit_id: string | null;
  upload_date: string;
};

/** Adding sends the file; editing sends only the details (type, note, shown name). */
export type DocumentInput = {
  documentType: DocumentType;
  description?: string;
  documentDate?: string;
  visitId?: string | null;
  fileName?: string;
  file?: File;
};

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] as const;

/** A visit saved together with the diagnoses, prescriptions and tests that came out of it. */
export type VisitBundleInput = {
  visit: VisitInput;
  conditions: { conditionName: string }[];
  medications: { medicationName: string; dosage?: string; frequency?: string }[];
  labResults: { testName: string; result?: string; referenceRange?: string }[];
};

export type VisitBundleResult = { visit: Visit; conditions: Condition[]; medications: Medication[]; lab_results: LabResult[] };

/** Everything linked to one visit. */
export type LinkedRecords = {
  conditions: Condition[];
  medications: Medication[];
  lab_results: LabResult[];
  documents: MedicalDocument[];
};

// ---- Sharing -------------------------------------------------------------------------------

// The sections a link can include. Name and blood group are always shown, so they are not listed.
export type ShareSection = 'allergies' | 'conditions' | 'visits' | 'medications' | 'lab_results' | 'documents' | 'emergency_contact';
export type ShareDuration = '1h' | '24h' | '7d';
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

// The reply to making a link. The address (and its secret) is shown once and never stored.
export type CreatedShare = { share: Share; token: string; url: string };

// The permanent QR: a link to everything that never expires, until the patient resets it.
export type StandingQr = { share_id: string; url: string; created_at: string; view_count: number; last_viewed_at: string | null };

export type ShareInput = { recordTypes: ShareSection[]; duration: ShareDuration };

// What the person holding a link sees.
export type SharedView = {
  patient: {
    first_name: string;
    last_name: string;
    blood_group: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
  };
  /** Null for the patient's permanent QR, which has no end date. */
  expires_at: string | null;
  standing?: boolean;
  record_types: ShareSection[];
  sections: {
    allergies?: Allergy[];
    conditions?: Condition[];
    visits?: Visit[];
    medications?: Medication[];
    lab_results?: LabResult[];
    documents?: MedicalDocument[];
  };
};

// ---- Doctor access (the patient's code and PIN) -----------------------------------------------

export type Access = {
  patient_code: string;
  has_pin: boolean;
  pin_set_at: string | null;
  /** Set while doctor access is locked after too many wrong PINs. */
  locked_until: string | null;
};

// ---- Who has seen the record -------------------------------------------------------------------

export type ActiveAccess = { session_id: string; doctor: string; facility: string | null; started_at: string; expires_at: string; via?: 'pin' | 'qr' };
export type AccessEvent = {
  id: string;
  type: 'doctor_session' | 'wrong_pin' | 'share_link';
  at: string;
  title: string;
  detail: string | null;
};
export type AccessHistory = { active: ActiveAccess[]; history: AccessEvent[] };

// ---- Who wrote a record ------------------------------------------------------------------------

/** Set when a doctor entered the record; null or missing when the patient did. */
export type EnteredBy = { provider_id: string; name: string; facility: string | null };

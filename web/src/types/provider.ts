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

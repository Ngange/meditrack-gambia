import { request } from './client';

export type Profile = {
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

export type ProfileInput = {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

export const getProfile = async () => (await request<{ profile: Profile }>('/patients/me')).profile;

export const updateProfile = async (input: ProfileInput) =>
  (await request<{ profile: Profile }>('/patients/me', { method: 'PUT', body: input })).profile;

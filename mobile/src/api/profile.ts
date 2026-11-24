import { request } from './client';
import { activeStore } from '@/offline/active';

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

/** The profile as last downloaded. Every sync refreshes it. */
export async function getProfile(): Promise<Profile> {
  const saved = await activeStore().profile<Profile>();
  if (!saved) throw new Error('Your profile has not been downloaded yet. Connect to the internet once to load it.');
  return saved;
}

/** Profile changes go straight to the server (they are not part of the offline queue), so they need a connection. */
export async function updateProfile(input: ProfileInput) {
  const { profile } = await request<{ profile: Profile }>('/patients/me', { method: 'PUT', body: input });
  await activeStore().setMeta('profile', JSON.stringify(profile));
  return profile;
}

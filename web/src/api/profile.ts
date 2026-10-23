import type { MyProfile, ProfileInput } from '../types/profile';
import { request } from './client';

export async function getMyProfile() {
  const data = await request<{ profile: MyProfile }>('/patients/me');
  return data.profile;
}

export async function updateMyProfile(input: ProfileInput) {
  const data = await request<{ profile: MyProfile }>('/patients/me', { method: 'PUT', body: input });
  return data.profile;
}

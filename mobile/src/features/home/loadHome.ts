import { getProfile, getSummary } from '@/api';

export async function loadHome() {
  const [profile, summary] = await Promise.all([getProfile(), getSummary()]);
  return { profile, summary };
}

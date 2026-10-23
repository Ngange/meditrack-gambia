import { getMyProfile } from '../api/profile';
import type { MyProfile } from '../types/profile';
import { useFetch } from './useFetch';

// The signed-in patient's profile. The app shell loads it once and shares it with every page.
export function useProfile() {
  const { data, setData, loading, error, reload } = useFetch(getMyProfile);

  return {
    profile: data,
    profileLoading: loading,
    profileError: error,
    setProfile: (p: MyProfile) => setData(p),
    reloadProfile: reload,
  };
}

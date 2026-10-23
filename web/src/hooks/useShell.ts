import { useOutletContext } from 'react-router-dom';
import type { MyProfile } from '../types/profile';

// What the app shell hands to every page inside it. Pages read the profile from here instead of
// each fetching it, so editing the profile updates the "Hi, ..." greeting immediately.
export type ShellContext = {
  profile: MyProfile | null;
  profileLoading: boolean;
  profileError: string;
  setProfile: (p: MyProfile) => void;
  reloadProfile: () => void;
};

export function useShell() {
  return useOutletContext<ShellContext>();
}

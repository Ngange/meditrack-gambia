import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';

/** Sends signed-out users to the login screen and signed-in users away from it. */
export function useAuthRedirect() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

  useEffect(() => {
    if (isLoading) return;
    if (!user && !inAuthGroup) router.replace('/login');
    else if (user && inAuthGroup) router.replace('/');
  }, [user, isLoading, inAuthGroup, router]);
}

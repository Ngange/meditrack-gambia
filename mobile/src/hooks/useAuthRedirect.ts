import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useDoctor } from '@/context/DoctorContext';
import { replaceDoctor } from '@/doctor/nav';

/**
 * Sends signed-out users to the login screen and signed-in users away from it.
 * A signed-in doctor (doctor mode) lives in the /doctor screens only; a patient never reaches them.
 */
export function useAuthRedirect() {
  const { user, isLoading } = useAuth();
  const { doctor } = useDoctor();
  const first = (useSegments() as string[])[0];
  const router = useRouter();

  const inAuthGroup = first === 'login' || first === 'register' || first === 'doctor-login';
  const inDoctor = first === 'doctor';

  useEffect(() => {
    if (isLoading) return;
    if (doctor) {
      if (!inDoctor) replaceDoctor('/doctor');
      return;
    }
    if (inDoctor) {
      router.replace('/login');
      return;
    }
    if (!user && !inAuthGroup) router.replace('/login');
    else if (user && inAuthGroup) router.replace('/');
  }, [user, doctor, isLoading, inAuthGroup, inDoctor, router]);
}

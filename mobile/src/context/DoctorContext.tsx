import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { doctorApi, setDoctorSignedOutHandler, setDoctorToken, type DoctorProfile } from '@/doctor/api';

type DoctorContextValue = {
  doctor: DoctorProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const DoctorContext = createContext<DoctorContextValue | null>(null);

export function DoctorProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);

  const signOut = useCallback(() => {
    setDoctorToken(null);
    setDoctor(null);
  }, []);

  useEffect(() => {
    setDoctorSignedOutHandler(signOut);
    return () => setDoctorSignedOutHandler(null);
  }, [signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    await doctorApi.login(email, password);
    try {
      setDoctor(await doctorApi.me());
    } catch (err) {
      setDoctorToken(null);
      throw err;
    }
  }, []);

  return <DoctorContext.Provider value={{ doctor, signIn, signOut }}>{children}</DoctorContext.Provider>;
}

export function useDoctor() {
  const ctx = useContext(DoctorContext);
  if (!ctx) throw new Error('useDoctor must be used inside DoctorProvider');
  return ctx;
}

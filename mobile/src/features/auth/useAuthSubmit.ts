import { router } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/api';

/** Runs a sign-in or sign-up call, tracks loading and the error message, and goes Home on success. */
export function useAuthSubmit() {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(action: () => Promise<void>) {
    setFormError('');
    setLoading(true);
    try {
      await action();
      router.replace('/');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return { loading, formError, submit };
}

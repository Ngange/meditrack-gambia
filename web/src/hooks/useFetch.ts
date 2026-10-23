import { useCallback, useEffect, useState } from 'react';
import { errorMessage, isAuthError } from '../api/client';

// Loads data when the component mounts, and again whenever reload() is called.
// fetcher must be a stable function (a module-level function, not one created inside a component).
// Auth failures are not shown as errors: the API client has already signed the user out.
export function useFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError('');
      })
      .catch((err) => {
        if (!cancelled && !isAuthError(err)) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, attempt]);

  const reload = useCallback(() => {
    setError('');
    setAttempt((n) => n + 1);
  }, []);

  return { data, setData, loading, error, reload };
}

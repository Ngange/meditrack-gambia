import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage, isAuthError } from '@/api';
import { useSync } from '@/context/SyncContext';

type State<T> = { data: T | null; loading: boolean; error: string };

/**
 * Loads data when a screen appears and again every time it comes back into focus
 * (for example after saving in a form). A 401/403 is handled centrally by the API client,
 * so the screen only ever sees ordinary errors.
 */
export function useFocusLoad<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: '' });
  const [refreshing, setRefreshing] = useState(false);

  // Always call the latest fetcher without making `load` change on every render.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // Only the newest request may update the screen.
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    try {
      const data = await fetcherRef.current();
      if (id === latest.current) setState({ data, loading: false, error: '' });
    } catch (err) {
      if (isAuthError(err) || id !== latest.current) return;
      setState((s) => ({ ...s, loading: false, error: errorMessage(err) }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // The saved records changed (a save, or a sync brought something in): show the new state.
  const { dataVersion, syncNow } = useSync();
  const seen = useRef(dataVersion);
  useEffect(() => {
    if (seen.current === dataVersion) return;
    seen.current = dataVersion;
    void load();
  }, [dataVersion, load]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    void load();
  }, [load]);

  // Pull to refresh also checks with the server (when sync is on and there is a connection).
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await syncNow().catch(() => undefined);
    await load();
    setRefreshing(false);
  }, [load, syncNow]);

  const setData = useCallback((data: T) => setState({ data, loading: false, error: '' }), []);

  return { ...state, refreshing, retry, refresh, setData };
}

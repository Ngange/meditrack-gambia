import * as Network from 'expo-network';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { bindSession, session } from '@/offline/appSession';
import type { SyncState } from '@/offline/session';

import { useAuth } from './AuthContext';

type Counts = { waiting: number; conflicts: number; rejected: number; lastSync: string | null };

type SyncContextValue = {
  state: SyncState;
  counts: Counts;
  syncEnabled: boolean;
  /** Goes up whenever the saved records change (a save here, or a sync bringing something in). Screens reload on it. */
  dataVersion: number;
  syncNow: () => Promise<void>;
  setSyncEnabled: (on: boolean) => Promise<void>;
  /** Signs in again with the password (device key refused). Local data and waiting changes stay. */
  reauth: (password: string) => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const EMPTY: Counts = { waiting: 0, conflicts: 0, rejected: 0, lastSync: null };
const AFTER_SAVE_MS = 1500;
const EVERY_MS = 5 * 60_000;

/**
 * Keeps the phone and the server in step in the background. A sync is tried: shortly after the patient saves
 * something, when the app opens or comes back to the front, when the connection returns, and every few
 * minutes. It never interrupts the patient: with no connection it just tries again later.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<SyncState>(session.state);
  const [counts, setCounts] = useState<Counts>(EMPTY);
  const [enabled, setEnabled] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const again = useRef(false);

  const refreshCounts = useCallback(async () => {
    const store = session.store;
    if (!store) return setCounts(EMPTY);
    const s = await store.status().catch(() => null);
    if (s) setCounts({ waiting: s.waiting, conflicts: s.conflicts, rejected: s.rejected, lastSync: s.lastSync });
  }, []);

  const runSync = useCallback(async () => {
    if (session.state.running) {
      again.current = true; // something was saved during this sync: go once more when it ends
      return;
    }
    await session.sync();
    if (again.current) {
      again.current = false;
      await session.sync();
    }
    await refreshCounts();
  }, [refreshCounts]);

  // Show the session's progress.
  useEffect(() => session.subscribe(() => setState({ ...session.state })), []);

  // Follow the signed-in account's records.
  useEffect(() => {
    const store = session.store;
    if (!user || !store) {
      setCounts(EMPTY);
      return;
    }
    let bump: ReturnType<typeof setTimeout> | null = null;
    let save: ReturnType<typeof setTimeout> | null = null;
    const offData = store.onData(() => {
      if (bump) clearTimeout(bump);
      bump = setTimeout(() => {
        setDataVersion((v) => v + 1);
        void refreshCounts();
      }, 120);
    });
    const offLocal = store.onLocalChange(() => {
      if (save) clearTimeout(save);
      save = setTimeout(() => void runSync(), AFTER_SAVE_MS);
    });
    void session.syncEnabled().then(setEnabled);
    void refreshCounts();
    void runSync(); // on opening the account
    return () => {
      offData();
      offLocal();
      if (bump) clearTimeout(bump);
      if (save) clearTimeout(save);
    };
  }, [user, refreshCounts, runSync]);

  // Back to the front, connection returns, every few minutes.
  useEffect(() => {
    if (!user) return;
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void runSync();
    });
    const netSub = Network.addNetworkStateListener((n) => {
      if (n.isConnected && n.isInternetReachable !== false) void runSync();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void runSync();
    }, EVERY_MS);
    return () => {
      appSub.remove();
      netSub.remove();
      clearInterval(timer);
    };
  }, [user, runSync]);

  const setSyncEnabled = useCallback(
    async (on: boolean) => {
      await session.setSyncEnabled(on);
      await bindSession();
      setEnabled(on);
      if (on) void runSync();
    },
    [runSync],
  );

  const reauth = useCallback(
    async (password: string) => {
      await session.reauth(password);
      await bindSession();
      void runSync();
    },
    [runSync],
  );

  return (
    <SyncContext.Provider value={{ state, counts, syncEnabled: enabled, dataVersion, syncNow: runSync, setSyncEnabled, reauth }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

import { loadThemeChoice, saveThemeChoice } from '@/utils/theme-storage';

export type Scheme = 'light' | 'dark';

type ThemeValue = { scheme: Scheme; toggle: () => void };

const ThemeContext = createContext<ThemeValue>({ scheme: 'dark', toggle: () => {} });

/** The app's colour mode: dark unless the user has switched to light. The choice is remembered. */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>('dark');

  useEffect(() => {
    void loadThemeChoice().then((saved) => {
      if (saved === 'light') setScheme('light');
    });
  }, []);

  // Also tells the phone itself (status bar, system dialogs) which mode the app is in.
  useEffect(() => {
    // (The browser build has no such call, so it is skipped there.)
    if (Platform.OS !== 'web') Appearance.setColorScheme(scheme);
  }, [scheme]);

  const toggle = useCallback(() => {
    setScheme((current) => {
      const next: Scheme = current === 'dark' ? 'light' : 'dark';
      void saveThemeChoice(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ scheme, toggle }), [scheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useThemeMode = () => useContext(ThemeContext);

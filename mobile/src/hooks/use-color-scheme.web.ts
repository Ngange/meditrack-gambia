import { useThemeMode } from '@/context/ThemeContext';

/** The app's colour mode (the user's choice, dark by default), not the browser's setting. */
export function useColorScheme() {
  return useThemeMode().scheme;
}

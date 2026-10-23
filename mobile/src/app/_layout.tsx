import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ReminderSync } from '@/features/medications/ReminderSync';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { configureReminders } from '@/services/reminders';

SplashScreen.preventAutoHideAsync();
configureReminders();

function RootNavigator() {
  const { isLoading } = useAuth();
  const segments = useSegments();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useAuthRedirect();

  if (isLoading) return null;

  // One safe-area wrapper for the whole app keeps every screen clear of the status bar,
  // and every screen draws its own header, so the built-in stack header is switched off.
  // The tab bar already keeps itself above the phone's navigation bar, so on the tab screens
  // only the top needs protecting. Every other screen (profile, forms, lists) needs the bottom too.
  const inTabs = segments[0] === '(tabs)';

  return (
    <SafeAreaView
      edges={inTabs ? ['top'] : ['top', 'bottom']}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <ReminderSync />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PressableCard } from '@/components/ui/pressable-card';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const ROWS = [
  { title: 'My profile', hint: 'Personal details and emergency contact', href: '/profile' },
  { title: 'Health records', hint: 'Allergies, conditions, visits, medications and more', href: '/records' },
] as const;

export function MoreScreen() {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut(); // the root layout sends the user back to the login screen
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">More</ThemedText>

        {ROWS.map((r) => (
          <PressableCard key={r.href} label={r.title} onPress={() => router.push(r.href)}>
            <ThemedText type="smallBold">{r.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {r.hint}
            </ThemedText>
          </PressableCard>
        ))}

        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.signOut}>
          <ThemedText themeColor="error">{signingOut ? 'Signing out…' : 'Sign out'}</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  signOut: { alignItems: 'center', padding: Spacing.three, marginTop: Spacing.three },
});

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

const ROWS = [
  { title: 'My profile', hint: 'Personal details and emergency contact', href: '/profile' },
  { title: 'Health records', hint: 'Allergies, conditions and more', href: '/records' },
] as const;

export default function MoreScreen() {
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
          <Pressable
            key={r.href}
            onPress={() => router.push(r.href)}
            accessibilityRole="button"
            accessibilityLabel={r.title}>
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">{r.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {r.hint}
              </ThemedText>
            </ThemedView>
          </Pressable>
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
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  signOut: { alignItems: 'center', padding: Spacing.three, marginTop: Spacing.three },
});
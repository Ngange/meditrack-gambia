import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Add new record types here as they are built (visits, medications, labs, documents).
const SECTIONS = [
  { title: 'Allergies', hint: 'Allergens and reactions', href: '/allergies' },
  { title: 'Medical conditions', hint: 'Diagnoses and ongoing conditions', href: '/conditions' },
] as const;

export default function RecordsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={{ gap: Spacing.two }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <ThemedText type="linkPrimary">‹ Back</ThemedText>
          </Pressable>
          <ThemedText type="title">Health records</ThemedText>
        </ThemedView>

        {SECTIONS.map((s) => (
          <Pressable
            key={s.href}
            onPress={() => router.push(s.href)}
            accessibilityRole="button"
            accessibilityLabel={s.title}>
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">{s.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {s.hint}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
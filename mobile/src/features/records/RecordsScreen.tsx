import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PressableCard } from '@/components/ui/pressable-card';
import { Spacing } from '@/constants/theme';

import { RECORD_TYPES } from './recordTypes';

export function RecordsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Health records" onBack={() => router.back()} />

      {RECORD_TYPES.map((t) => (
        <PressableCard key={t.href} label={t.title} onPress={() => router.push(t.href)}>
          <ThemedText type="smallBold">{t.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.hint}
          </ThemedText>
        </PressableCard>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
});

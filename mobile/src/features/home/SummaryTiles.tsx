import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import type { Summary } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { RECORD_TYPES } from '@/features/records/recordTypes';

/** One tile per record type, showing how many are recorded. Tapping opens that list. */
export function SummaryTiles({ summary }: { summary: Summary }) {
  return (
    <ThemedView style={styles.row}>
      {RECORD_TYPES.map((t) => (
        <Pressable
          key={t.key}
          style={styles.tileWrap}
          onPress={() => router.push(t.href)}
          accessibilityRole="button"
          accessibilityLabel={`${t.label}: ${summary[t.key]} recorded`}>
          <ThemedView type="backgroundElement" style={styles.tile}>
            <ThemedText type="title">{summary[t.key]}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t.label}
            </ThemedText>
          </ThemedView>
        </Pressable>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tileWrap: { flexBasis: '45%', flexGrow: 1 },
  tile: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});

import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import type { Summary } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatusPill } from '@/components/ui/status-pill';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RECORD_TYPES } from '@/features/records/recordTypes';

/** One tile per record type, showing how many are recorded. Tapping opens that list. */
export function SummaryTiles({ summary }: { summary: Summary }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.row}>
      {RECORD_TYPES.map((t) => (
        <Pressable
          key={t.key}
          style={styles.tileWrap}
          onPress={() => router.push(t.href)}
          accessibilityRole="button"
          accessibilityLabel={`${t.label}: ${summary[t.key]} recorded`}>
          <ThemedView type="backgroundElement" style={[styles.tile, { borderColor: theme.border }]}>
            <ThemedText type="title">{summary[t.key]}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t.label}
            </ThemedText>
            {t.key in summary.active ? (
              <StatusPill
                label={`${summary.active[t.key as keyof Summary['active']]} active`}
                tone={summary.active[t.key as keyof Summary['active']] > 0 ? 'good' : 'neutral'}
              />
            ) : null}
          </ThemedView>
        </Pressable>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tileWrap: { flexBasis: '45%', flexGrow: 1 },
  tile: { padding: Spacing.three, borderRadius: Radius.card, borderWidth: 1, gap: Spacing.one },
});

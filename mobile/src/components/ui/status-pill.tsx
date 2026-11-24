import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = 'good' | 'neutral' | 'info';

/** A small rounded label such as "1 active". */
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const theme = useTheme();
  const bg = tone === 'good' ? theme.successLight : tone === 'info' ? theme.primaryLight : theme.backgroundSelected;
  const fg = tone === 'good' ? theme.success : tone === 'info' ? theme.primary : theme.textSecondary;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <ThemedText type="small" style={[styles.text, { color: fg }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.half + 1, borderRadius: Radius.pill },
  text: { fontWeight: 600, fontSize: 12, lineHeight: 16 },
});

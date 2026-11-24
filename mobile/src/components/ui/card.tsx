import { StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A card: a step lighter than the page, with a thin border (as on the web app). */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Radius.card, borderWidth: 1, gap: Spacing.one },
});

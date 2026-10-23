import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  display: string;
  onDecrement: () => void;
  onIncrement: () => void;
};

/** A value with big − and + buttons: easy to hit, no typing and no keyboard. */
export function Stepper({ label, display, onDecrement, onIncrement }: Props) {
  const theme = useTheme();

  const button = (symbol: string, action: () => void, name: string) => (
    <Pressable
      onPress={action}
      accessibilityRole="button"
      accessibilityLabel={name}
      hitSlop={6}
      style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}>
      <ThemedText type="subtitle">{symbol}</ThemedText>
    </Pressable>
  );

  return (
    <ThemedView style={styles.wrap}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedView style={styles.row}>
        {button('−', onDecrement, `Decrease ${label.toLowerCase()}`)}
        <ThemedText type="subtitle" style={styles.value} accessibilityLabel={`${label}: ${display}`}>
          {display}
        </ThemedText>
        {button('+', onIncrement, `Increase ${label.toLowerCase()}`)}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: Spacing.one, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  button: {
    width: 48,
    height: 48,
    borderRadius: Radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 44, textAlign: 'center' },
});

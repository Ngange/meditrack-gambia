import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { capitalize } from '@/utils/text';

import { Chip } from './chip';

type Props<T extends string> = {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** Tapping the selected chip again clears the choice. */
  clearable?: boolean;
  format?: (option: T) => string;
};

export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  clearable = false,
  format = capitalize,
}: Props<T>) {
  return (
    <ThemedView style={styles.group}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedView style={styles.row}>
        {options.map((option) => (
          <Chip
            key={option}
            label={format(option)}
            selected={value === option}
            onPress={() => onChange(clearable && value === option ? null : option)}
          />
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});

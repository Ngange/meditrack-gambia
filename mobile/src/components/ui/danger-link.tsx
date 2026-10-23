import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function DangerLink({
  label,
  busyLabel,
  busy,
  disabled,
  onPress,
}: {
  label: string;
  busyLabel: string;
  busy: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.link}>
      <ThemedText themeColor="error">{busy ? busyLabel : label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignItems: 'center', padding: Spacing.two },
});

import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { Button } from './button';

/** A load error with a "Try again" button. */
export function ErrorNotice({
  message,
  onRetry,
  style,
}: {
  message: string;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ThemedView style={[styles.box, style]}>
      <ThemedText themeColor="error">⚠ {message}</ThemedText>
      <Button title="Try again" onPress={onRetry} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.three },
});

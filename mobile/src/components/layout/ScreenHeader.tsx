import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackLink } from '@/components/ui/back-link';
import { Spacing } from '@/constants/theme';

export function ScreenHeader({
  title,
  backLabel,
  onBack,
}: {
  title: string;
  backLabel?: string;
  onBack: () => void;
}) {
  return (
    <ThemedView style={styles.header}>
      <BackLink label={backLabel} onPress={onBack} />
      <ThemedText type="title">{title}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two },
});

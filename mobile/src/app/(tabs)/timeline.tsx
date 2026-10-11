import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function TimelineScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Timeline</ThemedText>
      <ThemedText themeColor="textSecondary">
        Coming soon. Your visits, medications, lab results and documents will appear here in date order,
        giving you one clear view of your medical history.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
});
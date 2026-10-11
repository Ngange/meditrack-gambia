import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function ShareScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Share</ThemedText>
      <ThemedText themeColor="textSecondary">
        Coming soon. You will choose which records to share, set how long the link lasts, and send it to a
        doctor or family member. They will not need an account, and you can revoke access at any time.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
});
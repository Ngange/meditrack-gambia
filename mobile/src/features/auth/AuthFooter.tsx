import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function AuthFooter({ prompt, linkLabel, href }: { prompt: string; linkLabel: string; href: '/login' | '/register' }) {
  return (
    <ThemedView style={styles.row}>
      <ThemedText themeColor="textSecondary">{prompt}</ThemedText>
      <Link href={href} replace>
        <ThemedText type="linkPrimary">{linkLabel}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.one },
});

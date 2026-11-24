import { router } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorNotice } from '@/components/ui/error-notice';
import { Spacing } from '@/constants/theme';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { activeStore } from '@/offline/active';

import { titleOfInput, TYPE_LABEL } from './describe';

const load = () => activeStore().rejected();
const VERB = { create: 'Adding', update: 'Changing', delete: 'Deleting' } as const;

/** Changes the server did not accept (a rule it checks that the phone cannot). They are not sent again; the patient can add them again. */
export function RejectedScreen() {
  const { data, loading, error, retry } = useFocusLoad(load);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Changes not saved" onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator style={styles.center} />
      ) : error && !data ? (
        <ErrorNotice message={error} onRetry={retry} style={styles.center} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => String(r.seq)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<ThemedText themeColor="textSecondary">Everything you saved was accepted.</ThemedText>}
          renderItem={({ item: r }) => (
            <Card style={styles.card}>
              <ThemedText type="smallBold">
                {VERB[r.op]} {TYPE_LABEL[r.type].toLowerCase()}
                {r.data ? `: ${titleOfInput(r.type, r.data)}` : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="error">
                {r.message}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {r.op === 'create'
                  ? 'It was removed from your lists. Add it again with the problem fixed.'
                  : r.op === 'update'
                    ? 'Your records show the last saved version.'
                    : 'The record is back in your lists.'}
              </ThemedText>
              <Button title="Dismiss" variant="secondary" onPress={() => void activeStore().dismissRejected(r.seq)} />
            </Card>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  center: { flex: 1, justifyContent: 'center' },
  list: { gap: Spacing.three, flexGrow: 1 },
  card: { gap: Spacing.two },
});

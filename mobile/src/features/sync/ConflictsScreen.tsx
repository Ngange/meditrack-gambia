import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorNotice } from '@/components/ui/error-notice';
import { Spacing } from '@/constants/theme';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { activeStore } from '@/offline/active';
import type { Conflict } from '@/offline/types';
import { showMessage } from '@/utils/notify';

import { differences, lines, titleOf, TYPE_LABEL } from './describe';

const load = () => activeStore().conflicts();

/**
 * A record that was changed on this phone and somewhere else (another phone, the web, a doctor) before the two
 * met. Nothing is overwritten until the patient picks: keep the version from this phone, or the server's.
 */
export function ConflictsScreen() {
  const { data, loading, error, retry } = useFocusLoad(load);
  const [busy, setBusy] = useState<string | null>(null);

  async function resolve(c: Conflict, choice: 'mine' | 'theirs') {
    setBusy(`${c.type}:${c.id}`);
    try {
      await activeStore().resolveConflict(c.type, c.id, choice);
    } catch (err) {
      showMessage('Could not save your choice', errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Needs your decision" onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator style={styles.center} />
      ) : error && !data ? (
        <ErrorNotice message={error} onRetry={retry} style={styles.center} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => `${c.type}:${c.id}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<ThemedText themeColor="textSecondary">Nothing to decide. Your records agree with the server.</ThemedText>}
          renderItem={({ item: c }) => {
            const isDelete = c.op === 'delete';
            const diffs = differences(c.type, c.mine, c.theirs);
            const working = busy === `${c.type}:${c.id}`;
            return (
              <Card style={styles.card}>
                <ThemedText type="smallBold">
                  {TYPE_LABEL[c.type]}: {titleOf(c.type, c.theirs)}
                </ThemedText>
                {isDelete ? (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      You deleted this on this phone, but it was changed somewhere else since. This is the version on the server:
                    </ThemedText>
                    {lines(c.type, c.theirs).map((l) => (
                      <ThemedText key={l.label} type="small">
                        {l.label}: {l.value}
                      </ThemedText>
                    ))}
                  </>
                ) : (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      You changed this on this phone, and it was changed somewhere else too. What differs:
                    </ThemedText>
                    {diffs.map((d) => (
                      <ThemedView key={d.label} style={styles.diff}>
                        <ThemedText type="smallBold">{d.label}</ThemedText>
                        <ThemedText type="small">This phone: {d.mine}</ThemedText>
                        <ThemedText type="small">Server: {d.theirs}</ThemedText>
                      </ThemedView>
                    ))}
                  </>
                )}
                <Button
                  title={isDelete ? 'Delete it anyway' : 'Keep mine'}
                  variant={isDelete ? 'destructive' : 'primary'}
                  loading={working}
                  onPress={() => void resolve(c, 'mine')}
                />
                <Button title={isDelete ? 'Keep it' : 'Keep theirs'} variant="secondary" disabled={working} onPress={() => void resolve(c, 'theirs')} />
              </Card>
            );
          }}
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
  diff: { gap: Spacing.half, backgroundColor: 'transparent' },
});

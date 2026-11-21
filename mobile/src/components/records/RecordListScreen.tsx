import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';
import { PressableCard } from '@/components/ui/pressable-card';
import { Spacing } from '@/constants/theme';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { errorMessage, isAuthError, type EnteredBy, type RecordApi } from '@/api';
import { confirmDestructive } from '@/utils/confirm';
import { formatDate } from '@/utils/dates';
import { openRecordForm } from '@/utils/navigation';
import { showMessage } from '@/utils/notify';

type Props<T> = {
  title: string;
  api: Pick<RecordApi<T, unknown>, 'list' | 'remove'>;
  /** Route of the add/edit form, e.g. '/allergy-form'. */
  formPath: string;
  addLabel: string;
  emptyMessage: string;
  getId: (item: T) => string;
  /** What a screen reader says for a row, e.g. "Edit allergy: Penicillin". */
  getLabel: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** An optional second button under the Add button, e.g. "Add several results". */
  secondaryAction?: { label: string; onPress: () => void };
};

const authorOf = (item: unknown) => (item as { entered_by?: EnteredBy | null }).entered_by ?? null;

const authorLine = (item: unknown) => {
  const by = authorOf(item);
  if (!by) return '';
  const date = (item as { created_at?: string }).created_at?.slice(0, 10);
  return `Entered by ${by.name}${by.facility ? `, ${by.facility}` : ''}${date ? `, ${formatDate(date)}` : ''}`;
};

/** The list screen shared by allergies, conditions, visits and medications. */
export function RecordListScreen<T>({
  title,
  api,
  formPath,
  addLabel,
  emptyMessage,
  getId,
  getLabel,
  renderItem,
  secondaryAction,
}: Props<T>) {
  const { data, loading, error, retry } = useFocusLoad(api.list);

  // A record a doctor entered cannot be edited by the patient (the server refuses too), so tapping it
  // offers the one thing they can do: remove it.
  function openItem(item: T) {
    const by = authorOf(item);
    if (!by) return openRecordForm(formPath, item);
    confirmDestructive(
      `Entered by ${by.name}`,
      'Your doctor entered this record, so it cannot be changed. You can remove it and add your own.',
      async () => {
        try {
          await api.remove(getId(item));
          retry();
        } catch (err) {
          if (!isAuthError(err)) showMessage('Could not remove it', errorMessage(err));
        }
      },
      'Remove',
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={title} onBack={() => router.back()} />

      {loading ? (
        <ActivityIndicator style={styles.center} />
      ) : error && !data ? (
        <ErrorNotice message={error} onRetry={retry} style={styles.center} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={getId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={error ? <ErrorNotice message={error} onRetry={retry} /> : null}
          ListEmptyComponent={<ThemedText themeColor="textSecondary">{emptyMessage}</ThemedText>}
          renderItem={({ item }) => (
            <PressableCard
              onPress={() => openItem(item)}
              label={authorOf(item) ? `${authorLine(item)}. Tap to remove.` : getLabel(item)}>
              {renderItem(item)}
              {authorOf(item) ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.author}>
                  {authorLine(item)}
                </ThemedText>
              ) : null}
            </PressableCard>
          )}
        />
      )}

      <Button title={addLabel} onPress={() => openRecordForm(formPath)} />
      {secondaryAction ? <Button title={secondaryAction.label} variant="secondary" onPress={secondaryAction.onPress} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  center: { flex: 1, justifyContent: 'center' },
  list: { gap: Spacing.two, flexGrow: 1 },
  author: { fontStyle: 'italic', marginTop: Spacing.one },
});

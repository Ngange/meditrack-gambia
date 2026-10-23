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
import type { RecordApi } from '@/api';
import { openRecordForm } from '@/utils/navigation';

type Props<T> = {
  title: string;
  api: Pick<RecordApi<T, unknown>, 'list'>;
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
            <PressableCard onPress={() => openRecordForm(formPath, item)} label={getLabel(item)}>
              {renderItem(item)}
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
});

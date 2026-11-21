import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';

import { errorMessage, isAuthError } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { ErrorNotice } from '@/components/ui/error-notice';
import { Spacing } from '@/constants/theme';
import { useFocusLoad } from '@/hooks/useFocusLoad';

import { timelineApi } from './api';
import { withMonths } from './months';
import { TimelineEventCard } from './TimelineEventCard';
import type { TimelineEvent, TimelineKind, TimelinePage } from './types';

type Filter = 'all' | TimelineKind;
const FILTERS: readonly Filter[] = ['all', 'visit', 'condition', 'medication', 'lab_panel', 'document'];
const FILTER_LABELS: Record<Filter, string> = {
  all: 'Everything',
  visit: 'Visits',
  condition: 'Diagnoses',
  medication: 'Medicines',
  lab_panel: 'Lab results',
  document: 'Documents',
};

const loadFirstPage = () => timelineApi.page(0);

/** Older pages are tied to the first page they were loaded after, so a refresh starts clean. */
type Older = { base: TimelinePage | null; events: TimelineEvent[]; hasMore: boolean };

export function TimelineScreen() {
  const { data, loading, error, refreshing, retry, refresh } = useFocusLoad(loadFirstPage);
  const [filter, setFilter] = useState<Filter>('all');
  const [older, setOlder] = useState<Older>({ base: null, events: [], hasMore: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');

  const extra = older.base === data ? older : null;
  const events = [...(data?.timeline ?? []), ...(extra?.events ?? [])];
  const hasMore = extra ? extra.hasMore : (data?.hasMore ?? false);
  const rows = withMonths(filter === 'all' ? events : events.filter((e) => e.kind === filter));

  async function showOlder() {
    setMoreError('');
    setLoadingMore(true);
    try {
      const page = await timelineApi.page(events.length);
      setOlder({ base: data, events: [...(extra?.events ?? []), ...page.timeline], hasMore: page.hasMore });
    } catch (err) {
      if (!isAuthError(err)) setMoreError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Timeline</ThemedText>

      {loading ? (
        <ActivityIndicator style={styles.center} />
      ) : error && !data ? (
        <ErrorNotice message={error} onRetry={retry} style={styles.center} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListHeaderComponent={
            <ThemedView style={styles.header}>
              {error ? <ErrorNotice message={error} onRetry={retry} /> : null}
              <ChipGroup label="Show" options={FILTERS} value={filter} onChange={(f) => f && setFilter(f)} format={(f) => FILTER_LABELS[f]} />
            </ThemedView>
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary">
              {events.length === 0
                ? 'Nothing here yet. Add a visit, medicine, lab result or document and it will appear here in date order.'
                : `Nothing of this kind among the ${events.length} entries loaded so far.`}
            </ThemedText>
          }
          ListFooterComponent={
            <ThemedView style={styles.footer}>
              {moreError ? <ErrorNotice message={moreError} onRetry={showOlder} /> : null}
              {hasMore ? <Button title="Show older" variant="secondary" onPress={showOlder} loading={loadingMore} /> : null}
            </ThemedView>
          }
          renderItem={({ item }) =>
            item.type === 'month' ? (
              <ThemedText type="smallBold" accessibilityRole="header" style={styles.month}>
                {item.label}
              </ThemedText>
            ) : (
              <TimelineEventCard event={item.event} />
            )
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  center: { flex: 1, justifyContent: 'center' },
  list: { gap: Spacing.two, flexGrow: 1 },
  header: { gap: Spacing.two, marginBottom: Spacing.two },
  footer: { gap: Spacing.two, marginTop: Spacing.two },
  month: { marginTop: Spacing.three },
});

import { useState } from 'react';
import { errorMessage, isAuthError } from '../../api/client';
import { timelineApi } from '../../api/timeline';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { useFetch } from '../../hooks/useFetch';
import { withMonths } from './months';
import { TimelineEventCard } from './TimelineEventCard';
import type { TimelineEvent, TimelineKind, TimelinePage as Page } from './types';
import './Timeline.css';

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

// Older pages belong to the first page they were loaded after, so a reload starts clean.
type Older = { base: Page | null; events: TimelineEvent[]; hasMore: boolean };

export function TimelinePage() {
  const { data, loading, error, reload } = useFetch(loadFirstPage);
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
    <div className="allergies-page">
      <div className="allergies-inner">
        <div className="allergies-head">
          <div>
            <h1>Timeline</h1>
            <p className="page-sub">Your visits and records in date order, with what came out of each visit</p>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : error && !data ? (
          <ErrorCard message={error} onRetry={reload} />
        ) : (
          <>
            <div className="tl-filters" role="group" aria-label="Show">
              {FILTERS.map((f) => (
                <button key={f} type="button" className="a-btn a-btn-sm" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>

            {rows.length === 0 ? (
              <p className="a-muted">
                {events.length === 0
                  ? 'Nothing here yet. Add a visit, medicine, lab result or document and it will appear here in date order.'
                  : `Nothing of this kind among the ${events.length} entries loaded so far.`}
              </p>
            ) : (
              <div className="tl-list">
                {rows.map((row) =>
                  row.type === 'month' ? (
                    <h2 key={row.key} className="tl-month">
                      {row.label}
                    </h2>
                  ) : (
                    <TimelineEventCard key={row.key} event={row.event} />
                  ),
                )}
              </div>
            )}

            {moreError && <ErrorCard message={moreError} onRetry={showOlder} />}
            {hasMore && (
              <div className="tl-more">
                <button type="button" className="a-btn" onClick={showOlder} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Show older'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

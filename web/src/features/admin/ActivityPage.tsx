import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { errorMessage } from '../../api/client';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { Pill } from '../../components/ui/Pill';
import type { ActivityEvent, ActivityFilters } from '../../types/provider';

const CATS = [
  ['all', 'Everything'],
  ['login', 'Logins'],
  ['session', 'Doctor sessions'],
  ['record', 'Record changes and views'],
  ['pin', 'PIN attempts'],
  ['sync', 'Phone syncs'],
  ['admin', 'Administrator actions'],
] as const;

const when = (iso: string) => new Date(iso).toLocaleString();
const who = (e: ActivityEvent) => (e.actor_name ? `${e.actor_role === 'provider' ? 'Dr ' : ''}${e.actor_name}` : e.actor_email ?? 'Someone without an account');
const kind = (t: string | null) => (t ? t.replace(/_/g, ' ') : '');

const csvCell = (v: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`;

// The timeline of what happened, built only from metadata. Record contents are never part of it.
export function ActivityPage() {
  const [params, setParams] = useSearchParams();
  // The person being looked at lives in the address, so clicking "Activity" in the menu goes back to everyone.
  const user = params.get('user') ?? undefined;
  const [own, setF] = useState<ActivityFilters>({ category: params.get('category') ?? 'all' });
  const f = useMemo(() => ({ ...own, user }), [own, user]);
  const [rows, setRows] = useState<ActivityEvent[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const [exporting, setExporting] = useState(false);
  const set = (p: Partial<ActivityFilters>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => {
    let off = false;
    const t = setTimeout(() => {
      setLoading(true);
      adminApi
        .activity({ ...f, limit: 50 })
        .then((r) => {
          if (off) return;
          setRows(r.events);
          setMore(r.has_more);
          setError('');
        })
        .catch((e) => !off && setError(errorMessage(e)))
        .finally(() => !off && setLoading(false));
    }, 250);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, [f, tick]);

  async function loadMore() {
    const r = await adminApi.activity({ ...f, limit: 50, offset: rows.length });
    setRows((x) => [...x, ...r.events]);
    setMore(r.has_more);
  }

  // The file is built here by asking for the pages one after another (up to 5,000 rows) with the current filters.
  async function exportCsv() {
    setExporting(true);
    try {
      const all: ActivityEvent[] = [];
      for (let off = 0; off < 5000; off += 500) {
        const r = await adminApi.activity({ ...f, limit: 500, offset: off });
        all.push(...r.events);
        if (!r.has_more) break;
      }
      const head = ['Time', 'Type', 'Action', 'Result', 'Who', 'Email', 'Patient', 'Patient code', 'Record type', 'IP address', 'Detail'];
      const lines = all.map((e) =>
        [new Date(e.at).toISOString(), e.category, e.action, e.result, e.actor_name, e.actor_email, e.patient_name, e.patient_code, e.record_type, e.ip, e.detail]
          // A cell that starts with = + - or @ could run as a formula when opened in a spreadsheet.
          .map((c) => csvCell(c && /^[=+\-@]/.test(c) ? `'${c}` : c))
          .join(','),
      );
      const blob = new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `meditrack-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="ad-page ad-wide">
      <h2>Activity</h2>
      <p className="a-meta">Who did what, when and from where, with the patient&apos;s name and code. You never see what a record says.</p>

      <div className="ad-filters">
        <input type="search" aria-label="Search activity" placeholder="Name, email, patient code or IP…" value={f.q ?? ''} onChange={(e) => set({ q: e.target.value })} />
        <select aria-label="Type" value={f.category ?? 'all'} onChange={(e) => set({ category: e.target.value })}>
          {CATS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select aria-label="Result" value={f.result ?? ''} onChange={(e) => set({ result: e.target.value })}>
          <option value="">Any result</option>
          <option value="ok">Succeeded</option>
          <option value="failed">Failed</option>
        </select>
        <label className="ad-date">
          From <input type="date" value={f.from ?? ''} onChange={(e) => set({ from: e.target.value })} />
        </label>
        <label className="ad-date">
          To <input type="date" value={f.to ?? ''} onChange={(e) => set({ to: e.target.value })} />
        </label>
        <button type="button" className="a-btn" disabled={exporting} onClick={exportCsv}>
          {exporting ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>
      {f.user && (
        <p className="a-note">
          Showing one person&apos;s activity.{' '}
          <button type="button" className="ad-linkbtn" onClick={() => setParams({})}>
            Show everyone
          </button>
        </p>
      )}

      {error ? (
        <ErrorCard message={error} onRetry={() => setTick((n) => n + 1)} />
      ) : loading && rows.length === 0 ? (
        <Loading />
      ) : rows.length === 0 ? (
        <p className="a-meta">Nothing matches these filters.</p>
      ) : (
        <ul className="ad-list">
          {rows.map((e, i) => (
            <li key={`${e.at}-${i}`} className="a-card ad-event">
              <div className="a-item-top">
                <strong>
                  {who(e)} · {e.action}
                  {e.record_type ? ` (${kind(e.record_type)})` : ''}
                </strong>
                {e.result === 'failed' && <Pill tone="red">Failed</Pill>}
              </div>
              {e.patient_name && (
                <span>
                  Patient: {e.patient_name} <span className="a-meta">({e.patient_code ?? '—'})</span>
                </span>
              )}
              {e.detail && <span>{e.detail}</span>}
              <span className="a-meta">
                {when(e.at)}
                {e.actor_email && e.actor_name ? ` · ${e.actor_email}` : ''}
                {e.ip ? ` · ${e.ip}` : ''}
                {e.source ? ` · ${e.source === 'app' ? 'phone' : 'web'}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      {more && (
        <button type="button" className="a-btn" onClick={loadMore}>
          Show more
        </button>
      )}
    </div>
  );
}

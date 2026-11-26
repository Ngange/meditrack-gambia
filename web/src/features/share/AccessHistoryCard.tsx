import { useState } from 'react';
import { accessApi } from '../../api/access';
import { errorMessage } from '../../api/client';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { useFetch } from '../../hooks/useFetch';
import type { ActiveAccess } from '../../types/records';
import { formatRemaining, useCountdown } from '../provider/useCountdown';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const fetchHistory = () => accessApi.history();

function ActiveRow({ item, onEnd, busy }: { item: ActiveAccess; onEnd: (a: ActiveAccess) => void; busy: boolean }) {
  const left = useCountdown(item.expires_at);
  return (
    <li className="sh-hist-item">
      <div className="sh-hist-live">
        <div>
          <strong>
            {item.doctor}
            {item.facility ? `, ${item.facility}` : ''}
          </strong>
          <div className="a-meta">
            Opened {when(item.started_at)}{item.via === 'qr' ? ' by scanning your QR code' : ''} · {left > 0 ? `${formatRemaining(left)} left` : 'ending now'}
          </div>
        </div>
        <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => onEnd(item)} disabled={busy} aria-label={`End access for ${item.doctor}`}>
          End access
        </button>
      </div>
    </li>
  );
}

// "Who has seen my record": doctors who can open it right now (with an End access button), and a
// plain-language history of past access.
export function AccessHistoryCard() {
  const [fetcher] = useState(() => fetchHistory);
  const { data, loading, error, reload } = useFetch(fetcher);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function run(confirmText: string, action: () => Promise<unknown>) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setActionError('');
    try {
      await action();
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorCard message={error || 'Could not load your access history.'} onRetry={reload} />;

  const endOne = (a: ActiveAccess) =>
    run(`End ${a.doctor}'s access now? They will need your PIN to open your record again.`, () => accessApi.endSession(a.session_id));
  const endAll = () => run('End access for every doctor now?', () => accessApi.endAll());

  return (
    <section className="a-card sh-hist" aria-label="Who has seen my record">
      <h2>Who has seen my record</h2>

      {actionError && (
        <p className="a-error" role="alert">
          ⚠ {actionError}
        </p>
      )}

      <h3>Open now</h3>
      {data.active.length === 0 ? (
        <p className="a-muted">No doctor has your record open.</p>
      ) : (
        <>
          <ul className="sh-hist-list">
            {data.active.map((a) => (
              <ActiveRow key={a.session_id} item={a} onEnd={endOne} busy={busy} />
            ))}
          </ul>
          {data.active.length > 1 && (
            <div className="a-actions">
              <button type="button" className="a-btn a-btn-danger" onClick={endAll} disabled={busy}>
                End all access
              </button>
            </div>
          )}
        </>
      )}

      <h3>History</h3>
      {data.history.length === 0 ? (
        <p className="a-muted">Nobody has opened your record yet.</p>
      ) : (
        <ul className="sh-hist-list">
          {data.history.map((e) => (
            <li key={e.id} className={`sh-hist-item${e.type === 'wrong_pin' ? ' warn' : ''}`}>
              <strong>{e.title}</strong>
              {e.detail && <div className="a-meta">{e.detail}</div>}
              <div className="a-meta">{when(e.at)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

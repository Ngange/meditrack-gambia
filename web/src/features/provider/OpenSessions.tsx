import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import { providerApi } from '../../api/provider';
import { useFetch } from '../../hooks/useFetch';
import type { ProviderSession } from '../../types/provider';
import { formatRemaining, useCountdown } from './useCountdown';

const fetchSessions = () => providerApi.sessions();

function Row({ session, onEnded, onError }: { session: ProviderSession; onEnded: () => void; onError: (m: string) => void }) {
  const left = useCountdown(session.expires_at);
  const [busy, setBusy] = useState(false);

  async function end() {
    setBusy(true);
    try {
      await providerApi.end(session.session_id);
      onEnded();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (left === 0) return null;
  return (
    <li className="a-card dr-session">
      <div>
        <strong>
          {session.patient.first_name} {session.patient.last_name}
        </strong>
        <div className="a-meta">{formatRemaining(left)} left</div>
      </div>
      <div className="a-actions">
        <Link className="a-btn a-btn-sm a-btn-primary" to={`/patient/${session.session_id}`}>
          Continue
        </Link>
        <button type="button" className="a-btn a-btn-sm" onClick={end} disabled={busy}>
          End access
        </button>
      </div>
    </li>
  );
}

// The patients a doctor has open right now.
export function OpenSessions() {
  const [fetcher] = useState(() => fetchSessions);
  const { data, error, reload } = useFetch(fetcher);
  const [actionError, setActionError] = useState('');

  if (!data || data.length === 0) return error ? <p className="a-error">⚠ {error}</p> : null;
  return (
    <section aria-label="Your open patients">
      <h2>Your open patients</h2>
      {(error || actionError) && <p className="a-error">⚠ {error || actionError}</p>}
      <ul className="dr-sessions">
        {data.map((s) => (
          <Row key={s.session_id} session={s} onEnded={reload} onError={setActionError} />
        ))}
      </ul>
    </section>
  );
}

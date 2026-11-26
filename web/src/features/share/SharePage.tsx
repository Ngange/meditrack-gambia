import { useCallback, useState } from 'react';
import { errorMessage } from '../../api/client';
import { sharesApi } from '../../api/shares';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { Pill } from '../../components/ui/Pill';
import { QrCode } from '../../components/ui/QrCode';
import { StandingQrCard } from './StandingQrCard';
import { useFetch } from '../../hooks/useFetch';
import type { CreatedShare, Share, ShareDuration, ShareSection } from '../../types/records';
import { AccessCard } from './AccessCard';
import { AccessHistoryCard } from './AccessHistoryCard';
import './Share.css';

const SECTIONS: { key: ShareSection; label: string }[] = [
  { key: 'allergies', label: 'Allergies' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'medications', label: 'Medications' },
  { key: 'visits', label: 'Visits' },
  { key: 'lab_results', label: 'Lab results' },
  { key: 'documents', label: 'Documents' },
  { key: 'emergency_contact', label: 'Emergency contact' },
];
const LABELS = Object.fromEntries(SECTIONS.map((s) => [s.key, s.label]));

const DURATIONS: { key: ShareDuration; label: string }[] = [
  { key: '1h', label: '1 hour' },
  { key: '24h', label: '24 hours' },
  { key: '7d', label: '7 days' },
];

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const statusTone = { active: 'green', expired: undefined, revoked: 'red' } as const;

const fetchShares = () => sharesApi.list();

export function SharePage() {
  const [fetcher] = useState(() => fetchShares);
  const { data: shares, loading, error, reload } = useFetch<Share[]>(fetcher);

  const [picked, setPicked] = useState<ShareSection[]>(['allergies', 'conditions', 'medications']);
  const [duration, setDuration] = useState<ShareDuration>('24h');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [created, setCreated] = useState<CreatedShare | null>(null);
  const [copied, setCopied] = useState(false);

  const toggle = (key: ShareSection) =>
    setPicked((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  async function create() {
    if (picked.length === 0) {
      setFormError('Tick at least one thing to share.');
      return;
    }
    setCreating(true);
    setFormError('');
    try {
      setCreated(await sharesApi.create({ recordTypes: picked, duration }));
      setCopied(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  // Prints only the QR sheet: while the body carries this class, print.css hides everything else.
  function printQr() {
    document.body.classList.add('sh-print-qr');
    const done = () => {
      document.body.classList.remove('sh-print-qr');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  }

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
    } catch {
      setFormError('Could not copy. Select the link and copy it by hand.');
    }
  }

  const revoke = useCallback(
    async (share: Share) => {
      if (!window.confirm('Turn this link off? Anyone who has it will no longer be able to open it.')) return;
      try {
        await sharesApi.revoke(share.share_id);
        reload();
      } catch (err) {
        setFormError(errorMessage(err));
      }
    },
    [reload],
  );

  return (
    <div className="sh-page">
      <header>
        <h1>Share Records</h1>
        <p className="a-muted">Let a doctor see your records, with a PIN or with a private link.</p>
      </header>

      <AccessCard />
      <StandingQrCard />
      <AccessHistoryCard />

      <section className="a-card sh-form" aria-label="Send a link">
        <h2>Or send a link</h2>
        <p className="a-muted">For a doctor without an account. They see only what you tick, read only. Your name and blood group are always shown.</p>

        <fieldset className="sh-chips">
          <legend>What to share</legend>
          {SECTIONS.map((s) => (
            <label key={s.key} className={`sh-chip${picked.includes(s.key) ? ' on' : ''}`}>
              <input type="checkbox" checked={picked.includes(s.key)} onChange={() => toggle(s.key)} />
              {s.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="sh-chips">
          <legend>Works for</legend>
          {DURATIONS.map((d) => (
            <label key={d.key} className={`sh-chip${duration === d.key ? ' on' : ''}`}>
              <input type="radio" name="duration" checked={duration === d.key} onChange={() => setDuration(d.key)} />
              {d.label}
            </label>
          ))}
        </fieldset>

        {formError && (
          <p className="a-error" role="alert">
            ⚠ {formError}
          </p>
        )}
        <div className="a-actions">
          <button type="button" className="a-btn a-btn-primary" onClick={create} disabled={creating}>
            {creating ? 'Creating…' : 'Create link'}
          </button>
        </div>
      </section>

      {created && (
        <section className="a-card sh-created" aria-label="New link">
          <h2>Your link is ready</h2>
          <p className="a-muted">Copy it now. For your safety it is shown only once.</p>
          <div className="sh-qr">
            <QrCode value={created.url} size={200} label="QR code for the share link" />
            <p className="a-muted">Or let the doctor scan this with their phone camera. It opens the same read-only page, with no app and no login.</p>
          </div>
          <input className="sh-url" readOnly value={created.url} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
          <div className="a-actions">
            <button type="button" className="a-btn a-btn-dark" onClick={copy}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <button type="button" className="a-btn" onClick={printQr}>
              Print QR
            </button>
            <button type="button" className="a-btn" onClick={() => setCreated(null)}>
              Done
            </button>
          </div>
        </section>
      )}

      {created && (
        <div className="sh-qr-sheet" aria-hidden>
          <h2>MediTrack Gambia</h2>
          <p>Scan to see a shared medical record (read only)</p>
          <QrCode value={created.url} size={320} label="QR code for the share link" />
          <p>Shared: {created.share.record_types.map((t) => LABELS[t] ?? t).join(', ')}</p>
          <p>Works until {when(created.share.expires_at)}</p>
        </div>
      )}

      <section aria-label="Your links">
        <h2>Your links</h2>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorCard message={error} onRetry={reload} />
        ) : !shares || shares.length === 0 ? (
          <p className="a-muted">You have not shared anything yet.</p>
        ) : (
          <div className="a-list">
            {shares.map((s) => (
              <article key={s.share_id} className="a-card">
                <div className="a-item-top">
                  <strong>{s.record_types.map((t) => LABELS[t] ?? t).join(', ')}</strong>
                  <Pill tone={statusTone[s.status]}>{s.status}</Pill>
                </div>
                <div className="a-meta">
                  Opened {s.view_count} {s.view_count === 1 ? 'time' : 'times'}
                  {s.last_viewed_at ? ` · last ${when(s.last_viewed_at)}` : ''}
                </div>
                <div className="a-meta">
                  {s.status === 'active' ? 'Expires' : s.status === 'revoked' ? 'Turned off' : 'Expired'}{' '}
                  {when(s.status === 'revoked' && s.revoked_at ? s.revoked_at : s.expires_at)}
                </div>
                {s.status === 'active' && (
                  <div className="a-actions">
                    <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => revoke(s)} aria-label="Turn off this link">
                      Turn off
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

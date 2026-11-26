import { useState } from 'react';
import { errorMessage } from '../../api/client';
import { sharesApi } from '../../api/shares';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { QrCode } from '../../components/ui/QrCode';
import { useFetch } from '../../hooks/useFetch';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const fetchStanding = () => sharesApi.standing();

// "My QR code": always here. One permanent QR for the whole record. A doctor with a MediTrack account scans it
// in the app and can add and edit records; anyone else who scans it gets the read-only page. The patient
// can reset it at any time, which kills every printed or photographed copy of the old one.
export function StandingQrCard() {
  const [fetcher] = useState(() => fetchStanding);
  const { data, loading, error, reload } = useFetch(fetcher);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.url);
      setNote('Link copied.');
    } catch {
      setNote('Could not copy. Select the link and copy it by hand.');
    }
  }

  function print() {
    document.body.classList.add('sh-print-standing');
    const done = () => {
      document.body.classList.remove('sh-print-standing');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  }

  async function reset() {
    if (!window.confirm('Reset your QR code? The old one stops working at once, including any copy you printed or sent. You will need to print the new one.')) return;
    setBusy(true);
    setNote('');
    try {
      await sharesApi.resetStanding();
      reload();
      setNote('Done. Your old QR code no longer works.');
    } catch (err) {
      setNote(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="a-card sh-standing" aria-label="My QR code">
      <h2>My QR code</h2>
      {loading && !data ? (
        <Loading />
      ) : error || !data ? (
        <ErrorCard message={error || 'Could not load your QR code.'} onRetry={reload} />
      ) : (
        <>
          <p className="a-muted">
            One QR for your whole record. A doctor with a MediTrack account who scans it in the app can add and edit your records for an
            hour, and you see it in "Who has seen my record". Anyone else who scans it with a phone camera sees your record read-only.
          </p>
          <div className="sh-qr">
            <QrCode value={data.url} size={200} label="Your permanent QR code" />
            <div>
              <p className="a-note">Keep it private. Anyone who has it, or a photo of it, can open your record until you reset it.</p>
              <p className="a-meta">
                Scanned {data.view_count} {data.view_count === 1 ? 'time' : 'times'}
                {data.last_viewed_at ? ` · last ${when(data.last_viewed_at)}` : ''}
              </p>
            </div>
          </div>
          <div className="a-actions">
            <button type="button" className="a-btn a-btn-dark" onClick={print}>
              Print QR
            </button>
            <button type="button" className="a-btn" onClick={copy}>
              Copy link
            </button>
            <button type="button" className="a-btn a-btn-danger" onClick={reset} disabled={busy}>
              {busy ? 'Resetting…' : 'Reset QR'}
            </button>
          </div>
          {note && (
            <p className="a-meta" role="status">
              {note}
            </p>
          )}
          <div className="sh-qr-sheet sh-qr-sheet-standing" aria-hidden>
            <h2>MediTrack Gambia</h2>
            <p>My medical record</p>
            <QrCode value={data.url} size={320} label="Your permanent QR code" />
            <p>Doctors with a MediTrack account: scan in the app.</p>
            <p>Anyone else: scan with a phone camera to see it read-only.</p>
          </div>
        </>
      )}
    </section>
  );
}

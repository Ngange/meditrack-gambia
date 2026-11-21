import { useState, type FormEvent } from 'react';
import { accessApi } from '../../api/access';
import { errorMessage } from '../../api/client';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { Pill } from '../../components/ui/Pill';
import { useFetch } from '../../hooks/useFetch';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const fetchAccess = () => accessApi.get();

// "Show my PIN to a doctor": the patient's code, and where they set the PIN a doctor must type with it.
export function AccessCard() {
  const [fetcher] = useState(() => fetchAccess);
  const { data, setData, loading, error, reload } = useFetch(fetcher);

  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);

  function close() {
    setEditing(false);
    setPin('');
    setConfirm('');
    setPassword('');
    setFormError('');
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) return setFormError('The PIN must be exactly 6 digits.');
    if (pin !== confirm) return setFormError('The two PINs do not match.');
    if (!password) return setFormError('Enter your account password.');
    setSaving(true);
    setFormError('');
    try {
      setData(await accessApi.setPin(pin, password));
      setSaved(true);
      close();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (error || !data) return <ErrorCard message={error || 'Could not load your access details.'} onRetry={reload} />;

  return (
    <section className="a-card sh-access" aria-label="Show my PIN to a doctor">
      <h2>Show my PIN to a doctor</h2>
      <p className="a-muted">A doctor with a MediTrack account can open your records. They need your code and your PIN.</p>

      <div>
        <p className="a-muted">Your code</p>
        <p className="sh-code" aria-label={`Your patient code is ${data.patient_code}`}>
          {data.patient_code}
        </p>
      </div>

      {data.locked_until ? (
        <p className="a-error" role="alert">
          ⚠ Doctor access is locked until {when(data.locked_until)} after too many wrong PINs. Choosing a new PIN ends the lock.
        </p>
      ) : data.has_pin ? (
        <p>
          <Pill tone="green">PIN set</Pill> <span className="a-muted">{data.pin_set_at ? `on ${when(data.pin_set_at)}` : ''}</span>
        </p>
      ) : (
        <p className="a-muted">You have not set a PIN yet, so no doctor can open your records. Set one below.</p>
      )}

      {saved && !editing && (
        <p role="status" className="a-note">
          PIN saved. Keep it private and tell your doctor yourself. Nobody, including this app, can show it to you again.
        </p>
      )}

      {editing ? (
        <form className="a-form sh-pin-form" onSubmit={save} noValidate>
          <div className="a-row">
            <label className="a-field">
              New PIN (6 digits)
              <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label className="a-field">
              Type it again
              <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))} />
            </label>
          </div>
          <label className="a-field">
            Your account password
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {formError && (
            <p className="a-error" role="alert">
              ⚠ {formError}
            </p>
          )}
          <div className="a-actions">
            <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save PIN'}
            </button>
            <button type="button" className="a-btn" onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="a-actions">
          <button
            type="button"
            className="a-btn a-btn-dark"
            onClick={() => {
              setSaved(false);
              setEditing(true);
            }}>
            {data.has_pin ? 'Change my PIN' : 'Set my PIN'}
          </button>
        </div>
      )}
    </section>
  );
}

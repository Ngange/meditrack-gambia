import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import { providerApi } from '../../api/provider';

// Where a verified doctor types the patient's code and PIN.
export function OpenPatientCard() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || !/^\d{6}$/.test(pin)) return setError("Enter the patient's code and their 6-digit PIN.");
    setBusy(true);
    setError('');
    try {
      const session = await providerApi.open(code.trim(), pin);
      navigate(`/patient/${session.session_id}`);
    } catch (err) {
      setError(errorMessage(err));
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="a-card dr-card" aria-label="Open a patient">
      <h2>Open a patient</h2>
      <p className="a-muted">Ask the patient for their code and PIN. You get one hour with their record, and they can see that you opened it.</p>
      <form className="a-form" onSubmit={submit} noValidate>
        <div className="a-row">
          <label className="a-field">
            Patient code
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MTG-1234-5678" autoComplete="off" />
          </label>
          <label className="a-field">
            PIN
            <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          </label>
        </div>
        {error && (
          <p className="a-error" role="alert">
            ⚠ {error}
          </p>
        )}
        <div className="a-actions">
          <button type="submit" className="a-btn a-btn-primary" disabled={busy}>
            {busy ? 'Opening…' : 'Open record'}
          </button>
        </div>
      </form>
    </section>
  );
}

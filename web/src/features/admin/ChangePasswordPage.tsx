import { useState, type FormEvent } from 'react';
import { errorMessage } from '../../api/client';
import { Logo } from '../../components/layout/Logo';
import '../../components/layout/AppShell.css';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import './Admin.css';

function Form({ forced }: { forced: boolean }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (next.length < 8) return setError('The new password must be at least 8 characters.');
    if (next !== again) return setError('The two new passwords are not the same.');
    setBusy(true);
    try {
      await changePassword(current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setAgain('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="a-card ad-form" onSubmit={submit}>
      <h2>{forced ? 'Choose your own password' : 'Change password'}</h2>
      {forced && <p className="a-meta">You signed in with a temporary password. Choose a new one to continue.</p>}
      <label htmlFor="pw-cur">{forced ? 'Temporary password' : 'Current password'}</label>
      <input id="pw-cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <label htmlFor="pw-new">New password (8 characters or more)</label>
      <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      <label htmlFor="pw-again">New password again</label>
      <input id="pw-again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
      {error && (
        <p className="a-error" role="alert">
          ⚠ {error}
        </p>
      )}
      {done && <p className="a-note">Password changed.</p>}
      <div className="ad-actions">
        <button type="submit" className="a-btn a-btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </div>
    </form>
  );
}

/** Inside the admin menu, for changing your own password whenever you like. */
export function AccountPage() {
  return (
    <div className="ad-page">
      <Form forced={false} />
    </div>
  );
}

/** Shown on its own, and nothing else is reachable, until a temporary password has been replaced. */
export function ForcedChangePasswordPage() {
  const { signOut } = useAuth();
  return (
    <div className="shell">
      <div className="shell-body">
        <header className="shell-head">
          <div className="shell-logo">
            <Logo />
          </div>
          <div className="shell-title">
            <h1>MediTrack Gambia</h1>
            <p>Administration</p>
          </div>
          <div className="shell-hi dr-actions">
            <ThemeToggle />
            <button type="button" className="a-btn a-btn-sm" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>
        <main className="shell-main">
          <div className="ad-page">
            <Form forced />
          </div>
        </main>
      </div>
    </div>
  );
}

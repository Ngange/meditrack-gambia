import { useState, type FormEvent } from 'react';
import { adminApi } from '../../api/admin';
import { errorMessage } from '../../api/client';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { Pill } from '../../components/ui/Pill';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import type { AdminAccount } from '../../types/provider';
import { formatDate } from '../../utils/dates';

const fetchAdmins = () => adminApi.admins();
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : 'never');

function NewAdmin({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [mine, setMine] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [made, setMade] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await adminApi.createAdmin(email.trim(), pw, mine);
      setMade(email.trim());
      setEmail('');
      setPw('');
      setMine('');
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-form-wrap">
      {made && (
        <p className="a-note">
          Created {made}. Give them the temporary password in person or by a private message. They must choose their own at first login.
        </p>
      )}
      {!open ? (
        <button type="button" className="a-btn a-btn-primary" onClick={() => { setOpen(true); setMade(''); }}>
          Add an administrator
        </button>
      ) : (
        <form className="a-card ad-form" onSubmit={submit}>
          <h3>New administrator</h3>
          <label htmlFor="na-email">Email</label>
          <input id="na-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="na-pw">Temporary password (8 characters or more)</label>
          <input id="na-pw" type="text" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
          <label htmlFor="na-mine">Your own password, to confirm</label>
          <input id="na-mine" type="password" autoComplete="current-password" value={mine} onChange={(e) => setMine(e.target.value)} />
          {error && (
            <p className="a-error" role="alert">
              ⚠ {error}
            </p>
          )}
          <div className="ad-actions">
            <button type="submit" className="a-btn a-btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create administrator'}
            </button>
            <button type="button" className="a-btn" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function AdminRow({ a, isMe, onDeleted }: { a: AdminAccount; isMe: boolean; onDeleted: () => void }) {
  const [panel, setPanel] = useState(false);
  const [typed, setTyped] = useState('');
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await adminApi.deleteUser(a.user_id, typed.trim(), why.trim());
      onDeleted();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <li className="a-card ad-event">
      <div className="a-item-top">
        <strong>{a.email}</strong>
        <span className="ad-row-side">
          {isMe && <Pill tone="blue">You</Pill>}
          {a.must_change_password && <Pill tone="warn">Temporary password</Pill>}
        </span>
      </div>
      <span className="a-meta">
        Added {formatDate(a.created_at.slice(0, 10))} · last login {when(a.last_login)}
      </span>
      {!isMe && !panel && (
        <div className="ad-actions">
          <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => setPanel(true)}>
            Delete administrator
          </button>
        </div>
      )}
      {panel && (
        <div className="ad-reason">
          <p>This removes their login for good. Their past actions stay in the log. To confirm, type their email and give a reason.</p>
          <label htmlFor={`da-${a.user_id}`}>Type {a.email}</label>
          <input id={`da-${a.user_id}`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          <label htmlFor={`dw-${a.user_id}`}>Reason</label>
          <textarea id={`dw-${a.user_id}`} value={why} maxLength={500} onChange={(e) => setWhy(e.target.value)} />
          <div className="ad-actions">
            <button type="button" className="a-btn a-btn-sm a-btn-danger" disabled={busy || !typed.trim() || !why.trim()} onClick={remove}>
              {busy ? 'Deleting…' : 'Delete for good'}
            </button>
            <button type="button" className="a-btn a-btn-sm" disabled={busy} onClick={() => setPanel(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="a-error" role="alert">
          ⚠ {error}
        </p>
      )}
    </li>
  );
}

export function AdminsPage() {
  const { user } = useAuth();
  const [f] = useState(() => fetchAdmins);
  const { data, loading, error, reload } = useFetch(f);

  return (
    <div className="ad-page">
      <h2>Administrators</h2>
      <p className="a-meta">Everyone who can sign in to this console. You cannot delete yourself.</p>
      <NewAdmin onCreated={reload} />
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorCard message={error || 'Could not load the administrators.'} onRetry={reload} />
      ) : (
        <ul className="ad-list">
          {data.map((a) => (
            <AdminRow key={a.user_id} a={a} isMe={a.user_id === user?.userId} onDeleted={reload} />
          ))}
        </ul>
      )}
    </div>
  );
}

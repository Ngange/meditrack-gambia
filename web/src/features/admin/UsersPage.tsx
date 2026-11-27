import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { errorMessage } from '../../api/client';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { Pill } from '../../components/ui/Pill';
import { useFetch } from '../../hooks/useFetch';
import type { AdminUser, AdminUserDetail } from '../../types/provider';
import { formatDate } from '../../utils/dates';

const day = (iso: string | null) => (iso ? formatDate(iso.slice(0, 10)) : 'never');
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : 'never');
const nameOf = (u: AdminUser) => (u.first_name ? `${u.role === 'provider' ? 'Dr ' : ''}${u.first_name} ${u.last_name}` : u.email);
const REASON: Record<string, string> = { ok: 'Signed in', bad_password: 'Wrong password', unknown_email: 'Unknown email', suspended: 'Suspended account' };
const ACTION: Record<string, string> = { suspend: 'Suspended', reactivate: 'Reactivated', revoke_devices: 'Signed out all phones' };

function Detail({ id, onChanged, onClose }: { id: string; onChanged: () => void; onClose: () => void }) {
  const fetcher = useCallback(() => adminApi.user(id), [id]);
  const { data, loading, error, reload } = useFetch<AdminUserDetail>(fetcher);
  const [panel, setPanel] = useState<null | 'suspend' | 'reactivate' | 'phones' | 'delete'>(null);
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function destroy() {
    setBusy(true);
    setErr('');
    try {
      await adminApi.deleteUser(id, typed.trim(), reason.trim());
      onChanged();
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  }

  async function run(kind: 'suspend' | 'reactivate' | 'phones') {
    if (kind === 'suspend' && !reason.trim()) return setErr('Write a reason. It is kept in the log.');
    setBusy(true);
    setErr('');
    try {
      if (kind === 'phones') {
        const r = await adminApi.signOutPhones(id, reason.trim());
        setMsg(`${r.phones_signed_out} phone${r.phones_signed_out === 1 ? '' : 's'} signed out.`);
      } else {
        const r = await adminApi.setStatus(id, kind === 'suspend' ? 'suspended' : 'active', reason.trim());
        setMsg(kind === 'suspend' ? `Suspended. ${r.phones_signed_out} phone(s) signed out, ${r.sessions_ended} open session(s) ended.` : 'Reactivated. They can log in again.');
      }
      setPanel(null);
      setReason('');
      reload();
      onChanged();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (error || !data) return <ErrorCard message={error || 'Could not load this user.'} onRetry={reload} />;
  const { user: u } = data;

  return (
    <section className="a-card ad-detail" aria-label="User details">
      <div className="a-item-top">
        <h3>{nameOf(u)}</h3>
        <button type="button" className="a-btn a-btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="dr-details">
        <dt>Email</dt>
        <dd>{u.email}</dd>
        <dt>Account</dt>
        <dd>
          {u.role === 'patient' ? 'Patient' : 'Doctor'} · <Pill tone={u.status === 'active' ? 'green' : 'red'}>{u.status === 'active' ? 'Active' : 'Suspended'}</Pill>
        </dd>
        {u.patient_code && (
          <>
            <dt>Patient code</dt>
            <dd>{u.patient_code}</dd>
          </>
        )}
        {u.licence_number && (
          <>
            <dt>Licence</dt>
            <dd>
              {u.licence_number} ({u.verification_status})
            </dd>
          </>
        )}
        <dt>Registered</dt>
        <dd>{day(u.created_at)}</dd>
        <dt>Last login</dt>
        <dd>{when(u.last_login)}</dd>
        {u.role === 'patient' && (
          <>
            <dt>Last phone sync</dt>
            <dd>{when(data.last_sync ?? null)}</dd>
            <dt>Active share links</dt>
            <dd>{data.shares ?? 0}</dd>
          </>
        )}
      </dl>
      {data.activity && (
        <p className="a-meta">
          {data.activity.sessions} sessions · {data.activity.patients} patients · {data.activity.records_added} records added · {data.activity.prints} prints
        </p>
      )}

      {msg && <p className="a-note">{msg}</p>}
      {panel === 'delete' ? (
        <div className="ad-reason">
          <p>
            <strong>This cannot be undone.</strong>{' '}
            {u.role === 'patient'
              ? 'Their account, all health records, documents, phones and share links are erased for good.'
              : 'Their login and details are erased. Records they entered stay with the patients, labelled as a removed doctor.'}
          </p>
          <label htmlFor="del-email">Type {u.email} to confirm</label>
          <input id="del-email" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          <label htmlFor="why-user">Reason (kept in the log)</label>
          <textarea id="why-user" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          <div className="ad-actions">
            <button type="button" className="a-btn a-btn-sm a-btn-danger" disabled={busy || !typed.trim() || !reason.trim()} onClick={destroy}>
              {busy ? 'Deleting…' : 'Delete for good'}
            </button>
            <button type="button" className="a-btn a-btn-sm" disabled={busy} onClick={() => setPanel(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : panel === null ? (
        <div className="ad-actions">
          {u.status === 'active' ? (
            <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => setPanel('suspend')}>
              Suspend
            </button>
          ) : (
            <button type="button" className="a-btn a-btn-sm a-btn-primary" onClick={() => setPanel('reactivate')}>
              Reactivate
            </button>
          )}
          {u.role === 'patient' && (
            <button type="button" className="a-btn a-btn-sm" onClick={() => setPanel('phones')}>
              Sign out all phones
            </button>
          )}
          <Link className="a-btn a-btn-sm" to={`/activity?user=${u.user_id}`}>
            See their activity
          </Link>
          <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => setPanel('delete')}>
            Delete account
          </button>
        </div>
      ) : (
        <div className="ad-reason">
          <p>
            {panel === 'suspend' && 'The person is signed out at once and cannot log in until you reactivate them. Their records are not touched.'}
            {panel === 'reactivate' && 'They will be able to log in again. Their phones must sign in again.'}
            {panel === 'phones' && 'Every phone loses its offline access and must sign in with a password again.'}
          </p>
          <label htmlFor="why-user">{panel === 'suspend' ? 'Reason (kept in the log)' : 'Note (optional)'}</label>
          <textarea id="why-user" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          <div className="ad-actions">
            <button type="button" className={`a-btn a-btn-sm ${panel === 'suspend' ? 'a-btn-danger' : 'a-btn-primary'}`} disabled={busy} onClick={() => run(panel)}>
              {busy ? 'Saving…' : 'Confirm'}
            </button>
            <button type="button" className="a-btn a-btn-sm" disabled={busy} onClick={() => setPanel(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {err && (
        <p className="a-error" role="alert">
          ⚠ {err}
        </p>
      )}

      <h4>Recent logins</h4>
      {data.logins.length === 0 ? (
        <p className="a-meta">None recorded yet.</p>
      ) : (
        <ul className="ad-mini">
          {data.logins.map((l, i) => (
            <li key={i}>
              <span className={l.success ? '' : 'a-error'}>{REASON[l.reason] ?? l.reason}</span>
              <span className="a-meta">
                {when(l.occurred_at)} · {l.source === 'app' ? 'phone' : 'web'}
                {l.ip ? ` · ${l.ip}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      {data.devices && data.devices.length > 0 && (
        <>
          <h4>Phones</h4>
          <ul className="ad-mini">
            {data.devices.map((d, i) => (
              <li key={i}>
                <span>{d.device_name || d.platform}</span>
                <span className="a-meta">
                  {d.revoked_at ? 'signed out' : `last seen ${when(d.last_seen_at)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {data.admin_actions.length > 0 && (
        <>
          <h4>Administrator actions</h4>
          <ul className="ad-mini">
            {data.admin_actions.map((a, i) => (
              <li key={i}>
                <span>
                  {ACTION[a.action] ?? a.action}
                  {a.note ? `: ${a.note}` : ''}
                </span>
                <span className="a-meta">
                  {when(a.occurred_at)} by {a.admin_email ?? 'a removed admin'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// Everyone with a patient or doctor account. Pick one to see their metadata and to suspend or reactivate them.
export function UsersPage() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let off = false;
    const t = setTimeout(() => {
      setLoading(true);
      adminApi
        .users({ q, role, status })
        .then((r) => {
          if (off) return;
          setRows(r.users);
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
  }, [q, role, status, tick]);

  async function loadMore() {
    const r = await adminApi.users({ q, role, status, offset: rows.length });
    setRows((x) => [...x, ...r.users]);
    setMore(r.has_more);
  }

  return (
    <div className="ad-page ad-wide">
      <h2>Users</h2>
      <p className="a-meta">Search by name, email or patient code.</p>
      <div className="ad-filters">
        <input type="search" aria-label="Search users" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Account type" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Patients and doctors</option>
          <option value="patient">Patients</option>
          <option value="provider">Doctors</option>
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className={`ad-split${picked ? ' has-detail' : ''}`}>
        <div>
          {error ? (
            <ErrorCard message={error} onRetry={() => setTick((n) => n + 1)} />
          ) : loading && rows.length === 0 ? (
            <Loading />
          ) : rows.length === 0 ? (
            <p className="a-meta">No one matches.</p>
          ) : (
            <ul className="ad-list">
              {rows.map((u) => (
                <li key={u.user_id}>
                  <button type="button" className={`a-card ad-row${picked === u.user_id ? ' is-on' : ''}`} onClick={() => setPicked(u.user_id)}>
                    <span className="ad-row-main">
                      <strong>{nameOf(u)}</strong>
                      <span className="a-meta">{u.email}</span>
                    </span>
                    <span className="ad-row-side">
                      <Pill tone={u.role === 'provider' ? 'blue' : undefined}>{u.role === 'provider' ? 'Doctor' : 'Patient'}</Pill>
                      {u.status === 'suspended' && <Pill tone="red">Suspended</Pill>}
                      <span className="a-meta">last login {day(u.last_login)}</span>
                    </span>
                  </button>
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
        {picked && <Detail key={picked} id={picked} onChanged={() => setTick((n) => n + 1)} onClose={() => setPicked(null)} />}
      </div>
    </div>
  );
}

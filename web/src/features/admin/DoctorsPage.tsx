import { useState } from 'react';
import { adminApi } from '../../api/admin';
import { errorMessage } from '../../api/client';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { Pill } from '../../components/ui/Pill';
import { useFetch } from '../../hooks/useFetch';
import type { AdminDecision, AdminProvider, DoctorActivity, VerificationStatus } from '../../types/provider';
import { formatDate } from '../../utils/dates';
import './Admin.css';

type Tab = VerificationStatus | 'all' | 'history';

const fetchProviders = () => adminApi.providers();
const fetchDecisions = () => adminApi.decisions();
const fetchActivity = () => adminApi.doctorActivity();

const LABEL: Record<VerificationStatus, string> = { pending: 'Awaiting verification', verified: 'Verified', rejected: 'Not verified' };
const TONE = { pending: 'warn', verified: 'green', rejected: 'red' } as const;
const day = (iso: string) => formatDate(iso.slice(0, 10));

function DoctorCard({ p, act, onChanged }: { p: AdminProvider; act?: DoctorActivity; onChanged: () => void }) {
  // 'approve' and 'reject' open a small panel under the buttons, so nothing happens on a single stray click.
  const [panel, setPanel] = useState<null | 'approve' | 'reject'>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function decide(decision: 'verified' | 'rejected') {
    if (decision === 'rejected' && !reason.trim()) return setError('Write a reason, so the doctor knows what to fix.');
    setBusy(true);
    setError('');
    try {
      await adminApi.review(p.provider_id, decision, reason.trim());
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <li className="a-card ad-doc">
      <div className="a-item-top">
        <h2>
          Dr {p.first_name} {p.last_name}
        </h2>
        <Pill tone={TONE[p.verification_status]}>{LABEL[p.verification_status]}</Pill>
      </div>
      <dl className="dr-details">
        <dt>Email</dt>
        <dd>{p.email}</dd>
        <dt>Licence number</dt>
        <dd>{p.licence_number}</dd>
        <dt>Clinic or hospital</dt>
        <dd>{p.facility_name}</dd>
        {p.specialty && (
          <>
            <dt>Speciality</dt>
            <dd>{p.specialty}</dd>
          </>
        )}
        <dt>Registered</dt>
        <dd>{day(p.created_at)}</dd>
      </dl>
      {act && p.verification_status === 'verified' && (
        <p className="a-meta ad-act">
          {act.sessions} session{act.sessions === 1 ? '' : 's'} · {act.patients} patient{act.patients === 1 ? '' : 's'} · {act.records_added} record
          {act.records_added === 1 ? '' : 's'} added · {act.prints} print{act.prints === 1 ? '' : 's'} ·{' '}
          {act.last_session ? `last active ${day(act.last_session)}` : 'never opened a patient'}
        </p>
      )}
      {p.verified_at && (
        <p className="a-meta">
          {p.verification_status === 'verified' ? 'Verified' : 'Rejected'} on {day(p.verified_at)}
          {p.decided_by ? ` by ${p.decided_by}` : ''}.{p.verification_note ? ` Note: ${p.verification_note}` : ''}
        </p>
      )}

      {panel === null && (
        <div className="ad-actions">
          {p.verification_status !== 'verified' && (
            <button type="button" className="a-btn a-btn-sm a-btn-primary" onClick={() => setPanel('approve')}>
              Verify
            </button>
          )}
          {p.verification_status !== 'rejected' && (
            <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => setPanel('reject')}>
              Reject
            </button>
          )}
        </div>
      )}

      {panel === 'approve' && (
        <div className="ad-reason">
          <p>
            Verify Dr {p.last_name}? They will be able to open patient records once a patient shares access.
          </p>
          <div className="ad-actions">
            <button type="button" className="a-btn a-btn-sm a-btn-primary" disabled={busy} onClick={() => decide('verified')}>
              {busy ? 'Saving…' : 'Yes, verify'}
            </button>
            <button type="button" className="a-btn a-btn-sm" disabled={busy} onClick={() => setPanel(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {panel === 'reject' && (
        <div className="ad-reason">
          <label htmlFor={`why-${p.provider_id}`}>Reason (the doctor will see this)</label>
          <textarea id={`why-${p.provider_id}`} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          <div className="ad-actions">
            <button type="button" className="a-btn a-btn-sm a-btn-danger" disabled={busy} onClick={() => decide('rejected')}>
              {busy ? 'Saving…' : 'Reject doctor'}
            </button>
            <button type="button" className="a-btn a-btn-sm" disabled={busy} onClick={() => setPanel(null)}>
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

function History({ rows }: { rows: AdminDecision[] }) {
  if (rows.length === 0) return <p className="a-meta">No decisions have been made yet.</p>;
  return (
    <ul className="ad-list">
      {rows.map((d) => (
        <li key={d.audit_id} className="a-card ad-log">
          <strong>
            Dr {d.first_name} {d.last_name} <span className="a-meta">({d.licence_number})</span>
          </strong>
          <span>
            {LABEL[d.previous_status]} → <strong>{LABEL[d.decision]}</strong>
          </span>
          {d.note && <span>Note: {d.note}</span>}
          <span className="a-meta">
            {day(d.decided_at)} by {d.admin_email ?? 'a removed admin'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DoctorsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [fp] = useState(() => fetchProviders);
  const [fd] = useState(() => fetchDecisions);
  const [fa] = useState(() => fetchActivity);
  const providers = useFetch(fp);
  const decisions = useFetch(fd);
  const activity = useFetch(fa);
  const actOf = (id: string) => activity.data?.find((a) => a.provider_id === id);

  const all = providers.data ?? [];
  // Counts appear once the list has loaded, so a tab never briefly claims there are none.
  const ready = providers.data !== null;
  const count = (s: VerificationStatus) => (ready ? ` (${all.filter((p) => p.verification_status === s).length})` : '');
  const shown = tab === 'all' ? all : all.filter((p) => p.verification_status === tab);
  const refresh = () => {
    providers.reload();
    decisions.reload();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pending', label: `Pending${count('pending')}` },
    { key: 'verified', label: `Verified${count('verified')}` },
    { key: 'rejected', label: `Rejected${count('rejected')}` },
    { key: 'all', label: `All${ready ? ` (${all.length})` : ''}` },
    { key: 'history', label: 'Decision history' },
  ];

  return (
    <div className="ad-page">
      <h2>Doctors</h2>
      <p className="a-meta">
        Check each doctor&apos;s licence number before verifying. Activity figures are counts only: you cannot see any patient&apos;s health records.
      </p>
      <div className="ad-tabs" role="tablist">
        {tabs.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} className={`ad-tab${tab === x.key ? ' is-on' : ''}`} onClick={() => setTab(x.key)}>
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'history' ? (
        decisions.loading ? (
          <Loading />
        ) : decisions.error || !decisions.data ? (
          <ErrorCard message={decisions.error || 'Could not load the decisions.'} onRetry={decisions.reload} />
        ) : (
          <History rows={decisions.data} />
        )
      ) : providers.loading ? (
        <Loading />
      ) : providers.error || !providers.data ? (
        <ErrorCard message={providers.error || 'Could not load the doctors.'} onRetry={providers.reload} />
      ) : shown.length === 0 ? (
        <p className="a-meta">{tab === 'pending' ? 'No doctors are waiting for a decision.' : 'No doctors here.'}</p>
      ) : (
        <ul className="ad-list">
          {shown.map((p) => (
            <DoctorCard key={`${p.provider_id}-${p.verified_at}`} p={p} act={actOf(p.provider_id)} onChanged={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import { providerApi } from '../../api/provider';
import { RecordsScopeProvider } from '../../components/records/RecordsScopeProvider';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { useFetch } from '../../hooks/useFetch';
import { formatDate } from '../../utils/dates';
import { AllergiesPage } from '../allergies/AllergiesPage';
import { ConditionsPage } from '../conditions/ConditionsPage';
import { LabResultsPage } from '../labs/LabResultsPage';
import { MedicationsPage } from '../medications/MedicationsPage';
import { VisitsPage } from '../visits/VisitsPage';
import { DoctorDocuments } from './DoctorDocuments';
import type { DoctorContext } from './DoctorShell';
import { formatRemaining, useCountdown } from './useCountdown';
import './Doctor.css';

const TABS = [
  { key: 'allergies', label: 'Allergies', Page: AllergiesPage },
  { key: 'conditions', label: 'Conditions', Page: ConditionsPage },
  { key: 'visits', label: 'Visits', Page: VisitsPage },
  { key: 'medications', label: 'Medications', Page: MedicationsPage },
  { key: 'labs', label: 'Lab results', Page: LabResultsPage },
  { key: 'documents', label: 'Documents', Page: DoctorDocuments },
] as const;

type Loaded = Awaited<ReturnType<typeof providerApi.getSession>>;

function Open({ sessionId, data, providerId }: { sessionId: string; data: Loaded; providerId: string }) {
  const left = useCountdown(data.session.expires_at);
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('allergies');
  const [ending, setEnding] = useState(false);
  const [endedByMe, setEndedByMe] = useState(false);
  const [error, setError] = useState('');
  const p = data.patient;
  const Page = TABS.find((t) => t.key === tab)!.Page;

  async function end() {
    setEnding(true);
    try {
      await providerApi.end(sessionId);
      setEndedByMe(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setEnding(false);
    }
  }

  if (endedByMe || left === 0) {
    return (
      <section className="a-card dr-card" role="status">
        <h2>{endedByMe ? 'Access ended' : 'Your hour is up'}</h2>
        <p className="a-muted">
          {endedByMe ? 'You closed this patient.' : 'Access to this patient has ended.'} To continue, ask the patient for their code and PIN again.
        </p>
        <div className="a-actions">
          <Link className="a-btn a-btn-primary" to="/">
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="dr-patient">
      <section className="a-card dr-banner" aria-label="Patient">
        <div>
          <h1>
            {p.first_name} {p.last_name}
          </h1>
          <div className="a-meta">
            Blood group <strong>{p.blood_group || 'not recorded'}</strong>
            {p.date_of_birth ? ` · Born ${formatDate(p.date_of_birth)}` : ''}
            {p.gender ? ` · ${p.gender}` : ''}
          </div>
          {(p.emergency_contact_name || p.emergency_contact_phone) && (
            <div className="a-meta">
              Emergency contact: {p.emergency_contact_name || '—'}
              {p.emergency_contact_phone ? ` · ${p.emergency_contact_phone}` : ''}
            </div>
          )}
        </div>
        <div className="dr-timer">
          <div className="a-meta" aria-live="off">
            Access ends in
          </div>
          <strong className="dr-clock">{formatRemaining(left)}</strong>
          <Link className="a-btn a-btn-sm" to={`/patient/${sessionId}/print`}>
            Print record
          </Link>
          <button type="button" className="a-btn a-btn-sm" onClick={end} disabled={ending}>
            {ending ? 'Ending…' : 'End access'}
          </button>
        </div>
      </section>
      {error && <p className="a-error">⚠ {error}</p>}

      <nav className="dr-tabs" aria-label="Record sections">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`dr-tab${tab === t.key ? ' is-on' : ''}`} aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <RecordsScopeProvider sessionId={sessionId} providerId={providerId}>
        <Page key={tab} />
      </RecordsScopeProvider>
    </div>
  );
}

const loadSession = (id: string) => () => providerApi.getSession(id);

// One patient a doctor has open. If the session has ended or run out, the server says so and this page explains.
export function DoctorPatientPage() {
  const { sessionId = '' } = useParams();
  const { provider } = useOutletContext<DoctorContext>();
  const [fetcher] = useState(() => loadSession(sessionId));
  const { data, loading, error, reload } = useFetch(fetcher);

  if (loading) return <Loading />;
  if (error || !data) {
    return (
      <div className="dr-card">
        <ErrorCard message={error || 'Could not open this patient.'} onRetry={reload} />
        <p>
          <Link to="/">Back to home</Link>
        </p>
      </div>
    );
  }
  return <Open sessionId={sessionId} data={data} providerId={provider.provider_id} />;
}

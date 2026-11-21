import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { sharedApi } from '../../api/shared';
import logo from '../../assets/logo.jpg';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Loading } from '../../components/ui/Loading';
import { useFetch } from '../../hooks/useFetch';
import { AllergiesSection, ConditionsSection, DocumentsSection, LabResultsSection, MedicationsSection, VisitsSection } from './SharedSections';
import './SharedView.css';

const formatWhen = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

// The page a doctor sees when a patient sends them a link. No login: the link is the key.
export function SharedViewPage() {
  const { token = '' } = useParams();
  const [fetcher] = useState(() => () => sharedApi.load(token));
  const { data, loading, error, reload } = useFetch(fetcher);

  // A private page: keep it out of search engines and do not pass the address on to other sites.
  useEffect(() => {
    const tags = [
      Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' }),
      Object.assign(document.createElement('meta'), { name: 'referrer', content: 'no-referrer' }),
    ];
    tags.forEach((t) => document.head.appendChild(t));
    return () => tags.forEach((t) => t.remove());
  }, []);

  const s = data?.sections;

  return (
    <div className="sv-page">
      <header className="sv-top">
        <img src={logo} alt="" className="sv-logo" />
        <div>
          <strong>MediTrack Gambia</strong>
          <div className="a-muted">Shared medical record · read only</div>
        </div>
        <span className="sv-spacer" />
        <span className="sv-noprint">
          <ThemeToggle />
        </span>
      </header>

      <main className="sv-main">
        {loading ? (
          <Loading />
        ) : error || !data ? (
          <div className="sv-unavailable">
            <ErrorCard message={error || 'This link is not available.'} onRetry={error.startsWith('Could not reach') ? reload : undefined} />
            <p className="a-muted">
              The link may have expired or been turned off by the patient. Ask them to send you a new one.
            </p>
          </div>
        ) : (
          <>
            <section className="a-card sv-patient" aria-label="Patient">
              <div>
                <h1>
                  {data.patient.first_name} {data.patient.last_name}
                </h1>
                <p className="a-muted">Blood group</p>
                <p className="sv-blood">{data.patient.blood_group || 'Not recorded'}</p>
              </div>
              {'emergency_contact_name' in data.patient && (
                <div>
                  <p className="a-muted">Emergency contact</p>
                  <p>
                    <strong>{data.patient.emergency_contact_name || 'Not recorded'}</strong>
                  </p>
                  {data.patient.emergency_contact_phone && <p>{data.patient.emergency_contact_phone}</p>}
                </div>
              )}
            </section>

            <p className="a-muted sv-expiry">
              The patient shared this with you. The link works until {formatWhen(data.expires_at)}.{' '}
              <button type="button" className="a-btn a-btn-sm sv-noprint" onClick={() => window.print()}>
                Print
              </button>
            </p>

            {s?.allergies && <AllergiesSection items={s.allergies} />}
            {s?.conditions && <ConditionsSection items={s.conditions} />}
            {s?.visits && <VisitsSection items={s.visits} />}
            {s?.medications && <MedicationsSection items={s.medications} />}
            {s?.lab_results && <LabResultsSection items={s.lab_results} />}
            {s?.documents && <DocumentsSection token={token} items={s.documents} />}
          </>
        )}
      </main>
    </div>
  );
}

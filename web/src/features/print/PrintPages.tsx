import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { errorMessage, request } from '../../api/client';
import { getMyProfile } from '../../api/profile';
import { providerApi } from '../../api/provider';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { useFetch } from '../../hooks/useFetch';
import type { DoctorContext } from '../provider/DoctorShell';
import { loadFullRecord } from './loadRecord';
import { PrintSheet } from './PrintSheet';
import './Print.css';

const loadMine = async () => {
  const [profile, record] = await Promise.all([getMyProfile(), loadFullRecord('/records')]);
  return { profile, record };
};

// The patient's own record, laid out for paper.
export function PatientPrintPage() {
  const [fetcher] = useState(() => loadMine);
  const { data, loading, error, reload } = useFetch(fetcher);
  if (loading) return <Loading />;
  if (error || !data) return <div className="pr-page"><ErrorCard message={error || 'Could not load your record.'} onRetry={reload} /></div>;
  const { profile, record } = data;
  return (
    <div className="pr-page">
      <div className="pr-toolbar pr-noprint">
        <Link className="a-btn" to="/">Back</Link>
        <p className="pr-hint">Choose Save as PDF in the print window to keep a copy.</p>
        <button type="button" className="a-btn a-btn-primary" onClick={() => window.print()}>Print</button>
      </div>
      <PrintSheet patient={profile} sections={record} note={`Printed by the patient (${profile.email}).`} />
    </div>
  );
}

// What a doctor with the patient open can see, laid out for paper. Each print is written to the
// patient's access history, so they can see that it happened.
export function DoctorPrintPage() {
  const { sessionId = '' } = useParams();
  const { provider } = useOutletContext<DoctorContext>();
  const [fetcher] = useState(() => async () => {
    const [session, record] = await Promise.all([providerApi.getSession(sessionId), loadFullRecord(`/provider/sessions/${sessionId}/records`)]);
    return { patient: session.patient, record };
  });
  const { data, loading, error, reload } = useFetch(fetcher);
  const [logError, setLogError] = useState('');

  useEffect(() => {
    document.title = 'Patient record';
  }, []);

  async function print() {
    setLogError('');
    try {
      await request(`/provider/sessions/${sessionId}/print`, { method: 'POST' });
    } catch (err) {
      setLogError(`${errorMessage(err)} Printing was not allowed.`);
      return; // no print without the audit line
    }
    window.print();
  }

  if (loading) return <Loading />;
  if (error || !data) {
    return (
      <div className="pr-page">
        <ErrorCard message={error || 'Could not load this patient.'} onRetry={reload} />
        <p><Link to="/">Back to home</Link></p>
      </div>
    );
  }
  return (
    <div className="pr-page">
      <div className="pr-toolbar pr-noprint">
        <Link className="a-btn" to={`/patient/${sessionId}`}>Back to patient</Link>
        <p className="pr-hint">The patient can see in their access history that you printed this.</p>
        <button type="button" className="a-btn a-btn-primary" onClick={print}>Print</button>
      </div>
      {logError && <p className="a-error pr-noprint" role="alert">⚠ {logError}</p>}
      <PrintSheet
        patient={data.patient}
        sections={data.record}
        note={`Printed by Dr ${provider.first_name} ${provider.last_name}, ${provider.facility_name} (licence ${provider.licence_number}).`}
      />
    </div>
  );
}

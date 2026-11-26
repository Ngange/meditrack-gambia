import { useOutletContext } from 'react-router-dom';
import { Pill } from '../../components/ui/Pill';
import { formatDate } from '../../utils/dates';
import type { DoctorContext } from './DoctorShell';
import { OpenPatientCard } from './OpenPatientCard';
import { OpenSessions } from './OpenSessions';
import { ScanQrCard } from './ScanQrCard';
import './Doctor.css';

// The doctor's home. For now it shows who they are and whether an admin has verified them.
export function DoctorHomePage() {
  const { provider, reload } = useOutletContext<DoctorContext>();
  const status = provider.verification_status;

  return (
    <div className="dr-page">
      {status === 'verified' && (
        <>
          <ScanQrCard />
          <OpenPatientCard />
          <OpenSessions />
        </>
      )}
      <section className="a-card dr-card" aria-label="Verification">
        <div className="a-item-top">
          <h2>Your account</h2>
          <Pill tone={status === 'verified' ? 'green' : status === 'rejected' ? 'red' : 'warn'}>
            {status === 'verified' ? 'Verified' : status === 'rejected' ? 'Not verified' : 'Awaiting verification'}
          </Pill>
        </div>

        {status === 'pending' && (
          <p className="a-note" role="status">
            An administrator will check your licence number. You will be able to open patient records once you are verified. This
            page updates when you press Check again.
          </p>
        )}
        {status === 'verified' && (
          <p className="a-meta" role="status">
            Your licence has been verified{provider.verified_at ? ` on ${formatDate(provider.verified_at.slice(0, 10))}` : ''}.
          </p>
        )}
        {status === 'rejected' && (
          <p className="a-error" role="alert">
            ⚠ Your licence could not be verified.{provider.verification_note ? ` Reason given: ${provider.verification_note}` : ''}{' '}
            Contact support if you think this is a mistake.
          </p>
        )}

        <dl className="dr-details">
          <dt>Name</dt>
          <dd>
            Dr {provider.first_name} {provider.last_name}
          </dd>
          <dt>Licence number</dt>
          <dd>{provider.licence_number}</dd>
          <dt>Clinic or hospital</dt>
          <dd>{provider.facility_name}</dd>
          {provider.specialty && (
            <>
              <dt>Specialty</dt>
              <dd>{provider.specialty}</dd>
            </>
          )}
          <dt>Email</dt>
          <dd>{provider.email}</dd>
        </dl>

        <div className="a-actions">
          <button type="button" className="a-btn" onClick={reload}>
            Check again
          </button>
        </div>
      </section>
    </div>
  );
}

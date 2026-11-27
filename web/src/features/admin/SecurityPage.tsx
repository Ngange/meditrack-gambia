import { useState } from 'react';
import { adminApi } from '../../api/admin';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { Pill } from '../../components/ui/Pill';
import { useFetch } from '../../hooks/useFetch';

const fetchSecurity = () => adminApi.security();
const TONE = { high: 'red', medium: 'warn', info: 'blue' } as const;
const LABEL = { high: 'High', medium: 'Medium', info: 'For information' } as const;

// Things that look unusual, each with the reason. The limits are fixed and shown, so nothing is a black box.
export function SecurityPage() {
  const [f] = useState(() => fetchSecurity);
  const { data, loading, error, reload } = useFetch(f);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorCard message={error || 'Could not load the security flags.'} onRetry={reload} />;
  const t = data.thresholds;

  return (
    <div className="ad-page">
      <h2>Security</h2>
      <p className="a-meta">
        A flag appears when {t.failedLogins} or more logins fail for one email in {t.windowHours} hours, when a doctor enters {t.failedPins} or more wrong PINs in {t.windowHours} hours,
        or when a doctor opens {t.patientsPerDoctorPerDay} or more different patients in one day. Suspended-account logins and QR resets are shown for {t.resetDays} days.
      </p>
      {data.flags.length === 0 ? (
        <p className="a-card">Nothing unusual right now.</p>
      ) : (
        <ul className="ad-list">
          {data.flags.map((fl, i) => (
            <li key={i} className="a-card ad-flag">
              <div className="a-item-top">
                <h3>{fl.title}</h3>
                <Pill tone={TONE[fl.severity]}>{LABEL[fl.severity]}</Pill>
              </div>
              <strong>{fl.subject}</strong>
              <span>{fl.detail}</span>
              <span className="a-meta">Latest {new Date(fl.at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="a-btn" onClick={reload}>
        Refresh
      </button>
    </div>
  );
}

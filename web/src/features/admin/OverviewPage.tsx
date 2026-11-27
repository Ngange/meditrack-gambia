import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { useFetch } from '../../hooks/useFetch';
import { TrendChart } from './TrendChart';

const fetchOverview = () => adminApi.overview();

function Stat({ label, value, to, warn }: { label: string; value: number; to?: string; warn?: boolean }) {
  const inner = (
    <>
      <span className={`ad-num${warn && value > 0 ? ' is-warn' : ''}`}>{value}</span>
      <span className="a-meta">{label}</span>
    </>
  );
  return to ? (
    <Link to={to} className="a-card ad-stat">
      {inner}
    </Link>
  ) : (
    <div className="a-card ad-stat">{inner}</div>
  );
}

// Totals and a 30-day trend. Everything here is a count: no names, no records.
export function OverviewPage() {
  const [f] = useState(() => fetchOverview);
  const { data, loading, error, reload } = useFetch(f);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorCard message={error || 'Could not load the overview.'} onRetry={reload} />;
  const { users, doctors, live, series } = data;
  const days = series.map((d) => d.day);

  return (
    <div className="ad-page ad-wide">
      <h2>Overview</h2>
      <p className="a-meta">Counts only. You never see anyone&apos;s health records from here.</p>

      <div className="ad-stats">
        <Stat label="Patients" value={users.patients} to="/users" />
        <Stat label="Doctors" value={users.doctors} to="/doctors" />
        <Stat label="Doctors awaiting verification" value={doctors.pending} to="/doctors" warn />
        <Stat label="Doctor sessions open now" value={live.open_sessions} to="/activity?category=session" />
        <Stat label="Permanent QR codes active" value={live.active_qr} />
        <Stat label="Phones registered" value={live.phones} />
        <Stat label="Logins in 24 hours" value={live.logins_24h} />
        <Stat label="Failed logins in 24 hours" value={live.failed_logins_24h} to="/security" warn />
        <Stat label="Suspended accounts" value={users.suspended} to="/users" warn />
      </div>

      <section className="a-card">
        <TrendChart
          title="Last 30 days"
          days={days}
          series={[
            { name: 'Logins', slot: 1, values: series.map((d) => d.logins) },
            { name: 'Doctor sessions', slot: 2, values: series.map((d) => d.sessions) },
            { name: 'New accounts', slot: 3, values: series.map((d) => d.patients + d.doctors) },
          ]}
        />
        <p className="a-meta">Logins are counted from the day the monitoring was installed.</p>
      </section>
    </div>
  );
}

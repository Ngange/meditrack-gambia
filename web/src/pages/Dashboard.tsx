import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllergies, getConditions, type Allergy, type Condition } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { getToken } from '../lib/auth-storage';
import { useShell } from '../components/AppShell';
import './Allergies.css'; // shared page styles (cards, buttons, pills)
import './Dashboard.css';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Activity = {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'Allergy' | 'Condition';
  title: string;
  detail: string;
  to: string;
};

export function DashboardPage() {
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;
  const { profile } = useShell();

  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const token = getToken();
      if (!token) {
        signOutRef.current();
        return;
      }
      const [a, c] = await Promise.all([getAllergies(token), getConditions(token)]);
      setAllergies(a.allergies);
      setConditions(c.conditions);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        signOutRef.current();
        return;
      }
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeAllergies = allergies.filter((a) => a.status === 'active');
  const activeConditions = conditions.filter((c) => c.status !== 'resolved');

  const activity: Activity[] = [
    ...allergies.map<Activity>((a) => ({
      id: a.allergy_id,
      date: a.created_at.slice(0, 10),
      type: 'Allergy',
      title: `Allergy: ${a.allergen}`,
      detail: [a.severity ? `${capitalize(a.severity)} severity` : '', a.reaction ?? '', capitalize(a.status)]
        .filter(Boolean)
        .join(' · '),
      to: '/allergies',
    })),
    ...conditions.map<Activity>((c) => ({
      id: c.condition_id,
      date: c.created_at.slice(0, 10),
      type: 'Condition',
      title: `Condition: ${c.condition_name}`,
      detail: [capitalize(c.status), c.diagnosis_date ? `Diagnosed ${c.diagnosis_date}` : '', c.notes ?? '']
        .filter(Boolean)
        .join(' · '),
      to: '/conditions',
    })),
  ]
    .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0))
    .slice(0, 6);

  const allergyNames = activeAllergies.map((a) => a.allergen);

  if (loading) return <p className="a-muted">Loading…</p>;

  if (error) {
    return (
      <div className="a-card">
        <p className="a-error" role="alert">⚠ {error}</p>
        <div className="a-actions" style={{ marginTop: 12 }}>
          <button type="button" className="a-btn" onClick={load}>Try again</button>
        </div>
      </div>
    );
  }

  const needsEmergencyInfo = profile !== null && (!profile.blood_group || !profile.emergency_contact_name);

  return (
    <div className="allergies-page">
      <div className="allergies-inner">
        <div className="dash-cards">
          <section className="a-card a-card-dashed dash-card">
            <div className="dash-card-head">
              <h2>Emergency profile</h2>
              <span className={`dash-blood${profile?.blood_group ? '' : ' is-empty'}`}>
                {profile?.blood_group ?? 'Not set'}
              </span>
            </div>
            <div className="dash-lines">
              {allergyNames.length > 0 ? (
                <div className="dash-allergy">Allergy: {allergyNames.join(' & ')}</div>
              ) : (
                <div className="a-muted">No active allergies recorded</div>
              )}
              <div className="a-muted">
                {profile?.emergency_contact_name
                  ? `Emergency: ${profile.emergency_contact_name}${profile.emergency_contact_phone ? ` - ${profile.emergency_contact_phone}` : ''}`
                  : 'No emergency contact yet'}
              </div>
            </div>
            <div className="dash-card-foot">
              <span />
              <Link to="/profile" className="dash-link">
                {needsEmergencyInfo ? 'Complete profile ›' : 'View profile ›'}
              </Link>
            </div>
          </section>

          <section className="a-card a-card-dashed dash-card">
            <div className="dash-card-head">
              <h2>Allergies</h2>
              <span className="a-pill a-pill-green">{activeAllergies.length} active</span>
            </div>
            <div className="dash-lines">
              {activeAllergies.slice(0, 2).map((a) => (
                <div key={a.allergy_id} className="dash-row">
                  <span>{a.allergen}</span>
                  <span className="a-muted">{a.severity ? capitalize(a.severity) : ''}</span>
                </div>
              ))}
              {activeAllergies.length === 0 ? <div className="a-muted">Nothing recorded yet</div> : null}
            </div>
            <div className="dash-card-foot">
              <Link to="/allergies" className="dash-plain">+ Add</Link>
              <Link to="/allergies" className="dash-link">Manage ›</Link>
            </div>
          </section>

          <section className="a-card a-card-dashed dash-card">
            <div className="dash-card-head">
              <h2>Conditions</h2>
              <span className="a-pill a-pill-blue">{activeConditions.length} active</span>
            </div>
            <div className="dash-lines">
              {activeConditions.slice(0, 2).map((c) => (
                <div key={c.condition_id} className="dash-row">
                  <span>{c.condition_name}</span>
                  <span className="a-muted">{capitalize(c.status)}</span>
                </div>
              ))}
              {activeConditions.length === 0 ? <div className="a-muted">Nothing recorded yet</div> : null}
            </div>
            <div className="dash-card-foot">
              <Link to="/conditions" className="dash-plain">+ Add</Link>
              <Link to="/conditions" className="dash-link">Manage ›</Link>
            </div>
          </section>
        </div>

        <section className="a-card dash-activity">
          <div className="dash-activity-head">
            <div>
              <h2>Recent activity</h2>
              <p className="page-sub">Your latest recorded allergies and conditions</p>
            </div>
            <div className="a-actions">
              <Link to="/allergies" className="a-btn">+ Add allergy</Link>
              <Link to="/conditions" className="a-btn a-btn-dark">+ Add condition</Link>
            </div>
          </div>

          {activity.length === 0 ? (
            <p className="a-muted dash-empty">
              No records yet. Start with your allergies and conditions — they are the first things a doctor will ask
              about.
            </p>
          ) : (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Summary</th>
                    <th className="dash-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((r) => (
                    <tr key={`${r.type}-${r.id}`}>
                      <td className="dash-mono">{r.date}</td>
                      <td>
                        <span className="a-pill">{r.type}</span>
                      </td>
                      <td>
                        <div className="dash-title">{r.title}</div>
                        <div className="a-muted dash-detail">{r.detail}</div>
                      </td>
                      <td className="dash-right">
                        <Link to={r.to} className="dash-details">Details</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
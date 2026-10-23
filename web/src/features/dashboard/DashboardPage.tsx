import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { useFetch } from '../../hooks/useFetch';
import { useShell } from '../../hooks/useShell';
import { capitalize } from '../../utils/text';
import { buildActivity } from './activity';
import { EmergencyCard } from './EmergencyCard';
import { loadDashboard } from './loadDashboard';
import { RecentActivity } from './RecentActivity';
import { SummaryCard } from './SummaryCard';
import './Dashboard.css';

export function DashboardPage() {
  const { profile } = useShell();
  const { data, loading, error, reload } = useFetch(loadDashboard);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorCard message={error || 'Could not load your records.'} onRetry={reload} />;

  const activeAllergies = data.allergies.filter((a) => a.status === 'active');
  const activeConditions = data.conditions.filter((c) => c.status !== 'resolved');
  const activeMedications = data.medications.filter((m) => m.status === 'active');

  return (
    <div className="allergies-page">
      <div className="allergies-inner">
        <div className="dash-cards">
          <EmergencyCard profile={profile} activeAllergies={activeAllergies} />
          <SummaryCard
            title="Active medications"
            count={activeMedications.length}
            tone="green"
            rows={activeMedications.slice(0, 2).map((m) => ({ key: m.medication_id, name: m.medication_name, detail: m.dosage ?? '' }))}
            to="/medications"
          />
          <SummaryCard
            title="Allergies"
            count={activeAllergies.length}
            tone="green"
            rows={activeAllergies
              .slice(0, 2)
              .map((a) => ({ key: a.allergy_id, name: a.allergen, detail: a.severity ? capitalize(a.severity) : '' }))}
            to="/allergies"
          />
          <SummaryCard
            title="Conditions"
            count={activeConditions.length}
            tone="blue"
            rows={activeConditions
              .slice(0, 2)
              .map((c) => ({ key: c.condition_id, name: c.condition_name, detail: capitalize(c.status) }))}
            to="/conditions"
          />
        </div>

        <RecentActivity activity={buildActivity(data)} />
      </div>
    </div>
  );
}

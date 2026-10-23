import { allergiesApi } from '../../api/allergies';
import { conditionsApi } from '../../api/conditions';
import { labResultsApi } from '../../api/labResults';
import { medicationsApi } from '../../api/medications';
import { visitsApi } from '../../api/visits';

// Everything the dashboard shows, fetched together. A module-level function so useFetch
// can keep a stable reference to it.
export async function loadDashboard() {
  const [allergies, conditions, visits, medications, labResults] = await Promise.all([
    allergiesApi.list(),
    conditionsApi.list(),
    visitsApi.list(),
    medicationsApi.list(),
    labResultsApi.list(),
  ]);
  return { allergies, conditions, visits, medications, labResults };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;

import { visitsApi } from '../../api/visits';
import { useFetch } from '../../hooks/useFetch';

// "Which visit was this from?" An optional link from a record to one of the patient's visits.
export function VisitPicker({ value, onChange }: { value: string | null; onChange: (visitId: string | null) => void }) {
  const { data: visits, error } = useFetch(visitsApi.list);

  return (
    <label className="a-field">
      <span>From which visit? (optional)</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} disabled={!visits}>
        <option value="">No visit</option>
        {(visits ?? []).map((v) => (
          <option key={v.visit_id} value={v.visit_id}>
            {v.visit_date} · {v.facility_name || v.reason || 'Visit'}
          </option>
        ))}
      </select>
      {error && <small className="a-muted">Could not load your visits. You can link this later.</small>}
      {visits && visits.length === 0 && <small className="a-muted">No visits recorded yet. Add the visit first to link this to it.</small>}
    </label>
  );
}

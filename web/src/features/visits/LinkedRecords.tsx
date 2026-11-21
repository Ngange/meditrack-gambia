import { useState } from 'react';
import { visitsApi } from '../../api/visits';
import { useFetch } from '../../hooks/useFetch';
import { DOCUMENT_TYPE_LABELS } from '../../types/records';

// On an existing visit: what came out of it. Link more from each record's own edit form.
export function LinkedRecords({ visitId }: { visitId: string }) {
  const [fetcher] = useState(() => () => visitsApi.linked(visitId));
  const { data: linked } = useFetch(fetcher);
  if (!linked) return null;

  const lines: [string, string[]][] = [
    ['Diagnoses', linked.conditions.map((c) => c.condition_name)],
    ['Prescriptions', linked.medications.map((m) => [m.medication_name, m.dosage].filter(Boolean).join(' '))],
    ['Tests', linked.lab_results.map((r) => [r.test_name, r.result].filter(Boolean).join(': '))],
    ['Documents', linked.documents.map((d) => `${d.file_name} (${DOCUMENT_TYPE_LABELS[d.document_type]})`)],
  ];
  const shown = lines.filter(([, items]) => items.length > 0);

  return (
    <div className="visit-linked">
      <strong>What came out of this visit</strong>
      {shown.length === 0 ? (
        <p className="a-muted">Nothing is linked to this visit yet. Choose this visit when you add or edit a diagnosis, medicine, test or document.</p>
      ) : (
        shown.map(([title, items]) => (
          <p key={title} className="a-meta">
            {title}: {items.join('; ')}
          </p>
        ))
      )}
    </div>
  );
}

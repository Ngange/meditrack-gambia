import { Pill } from '../../components/ui/Pill';
import type { Medication } from '../../types/records';
import { capitalize } from '../../utils/text';

export function MedicationCard({ medication: m }: { medication: Medication }) {
  return (
    <>
      <div className="a-item-top">
        <strong>{m.medication_name}</strong>
        <Pill tone={m.status === 'active' ? 'green' : undefined}>{capitalize(m.status)}</Pill>
      </div>
      {(m.dosage || m.frequency) && <div className="a-note">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</div>}
      <div className="a-meta">
        Started {m.start_date}
        {m.end_date ? ` · Ended ${m.end_date}` : ''}
      </div>
      {m.reminder_times.length > 0 && <div className="a-meta">Reminders: {m.reminder_times.join(', ')}</div>}
    </>
  );
}

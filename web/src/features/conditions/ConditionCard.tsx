import { Pill } from '../../components/ui/Pill';
import type { Condition } from '../../types/records';
import { capitalize } from '../../utils/text';

export function ConditionCard({ condition: c }: { condition: Condition }) {
  return (
    <>
      <div className="a-item-top">
        <strong>{c.condition_name}</strong>
        <Pill>{capitalize(c.status)}</Pill>
      </div>
      <div className="a-meta">
        {c.diagnosis_date ? `Diagnosed: ${c.diagnosis_date}` : 'Diagnosis date not recorded'}
      </div>
      {c.notes && <div className="a-note">{c.notes}</div>}
    </>
  );
}

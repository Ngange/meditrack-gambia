import { Pill } from '../../components/ui/Pill';
import type { Allergy } from '../../types/records';
import { capitalize } from '../../utils/text';

export function AllergyCard({ allergy: a }: { allergy: Allergy }) {
  return (
    <>
      <div className="a-item-top">
        <strong>{a.allergen}</strong>
        <Pill tone={a.severity === 'severe' && a.status === 'active' ? 'red' : undefined}>
          {a.status === 'resolved' ? 'Resolved' : a.severity ? capitalize(a.severity) : 'Active'}
        </Pill>
      </div>
      <div className="a-meta">
        {capitalize(a.status)}
        {a.severity ? ` · ${capitalize(a.severity)} severity` : ''}
      </div>
      {a.reaction && <div className="a-note">{a.reaction}</div>}
    </>
  );
}

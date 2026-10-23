import { Pill } from '../../components/ui/Pill';
import type { LabResult } from '../../types/records';

export function LabResultCard({ lab: r }: { lab: LabResult }) {
  return (
    <>
      <div className="a-item-top">
        <strong>{r.test_name}</strong>
        <Pill>{r.test_date}</Pill>
      </div>
      {r.result && <div className="a-note">Result: {r.result}</div>}
      {r.reference_range && <div className="a-meta">Normal range: {r.reference_range}</div>}
      {r.facility_name && <div className="a-meta">{r.facility_name}</div>}
    </>
  );
}

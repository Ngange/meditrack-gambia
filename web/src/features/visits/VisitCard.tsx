import { Pill } from '../../components/ui/Pill';
import type { Visit } from '../../types/records';

export function VisitCard({ visit: v }: { visit: Visit }) {
  return (
    <>
      <div className="a-item-top">
        <strong>{v.facility_name || 'Visit'}</strong>
        <Pill>{v.visit_date}</Pill>
      </div>
      {v.reason && <div className="a-meta">Reason: {v.reason}</div>}
      {(v.diagnosis || v.treatment || v.notes) && (
        <div className="a-note">
          {v.diagnosis && <div>Diagnosis: {v.diagnosis}</div>}
          {v.treatment && <div>Treatment: {v.treatment}</div>}
          {v.notes && <div className="a-muted">{v.notes}</div>}
        </div>
      )}
    </>
  );
}

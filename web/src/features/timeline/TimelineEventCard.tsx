import { Link } from 'react-router-dom';
import { Pill } from '../../components/ui/Pill';
import { DOCUMENT_TYPE_LABELS } from '../../types/records';
import type { TimelineEvent } from './types';

const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ');
const test = (r: { test_name: string; result: string | null }) => (r.result ? `${r.test_name}: ${r.result}` : r.test_name);

// One timeline entry, with a link to the page where it can be edited.
export function TimelineEventCard({ event }: { event: TimelineEvent }) {
  switch (event.kind) {
    case 'visit': {
      const v = event.visit;
      return (
        <article className="a-card tl-card tl-visit">
          <div className="a-item-top">
            <strong>{v.facility_name || v.reason || 'Visit'}</strong>
            <Pill tone="blue">Visit · {event.date}</Pill>
          </div>
          {v.facility_name && v.reason && <div className="a-meta">Reason: {v.reason}</div>}
          {event.conditions.length > 0 && <div className="a-note">Diagnosed: {event.conditions.map((c) => c.condition_name).join('; ')}</div>}
          {event.medications.length > 0 && <div className="a-note">Prescribed: {event.medications.map((m) => join(m.medication_name, m.dosage)).join('; ')}</div>}
          {event.lab_results.length > 0 && <div className="a-note">Tests: {event.lab_results.map(test).join('; ')}</div>}
          {event.documents.length > 0 && <div className="a-note">Documents: {event.documents.map((d) => d.file_name).join('; ')}</div>}
          <Link className="a-btn a-btn-sm" to="/visits" aria-label={`Open visit on ${event.date}${v.facility_name ? ` at ${v.facility_name}` : ''}`}>
            Open in Visits
          </Link>
        </article>
      );
    }
    case 'condition':
      return (
        <article className="a-card tl-card">
          <div className="a-item-top">
            <strong>{event.condition.condition_name}</strong>
            <Pill>Diagnosis · {event.date}</Pill>
          </div>
          <div className="a-meta">Status: {event.condition.status}</div>
          <Link className="a-btn a-btn-sm" to="/conditions" aria-label={`Open diagnosis ${event.condition.condition_name}`}>
            Open in Conditions
          </Link>
        </article>
      );
    case 'medication':
      return (
        <article className="a-card tl-card">
          <div className="a-item-top">
            <strong>{join(event.medication.medication_name, event.medication.dosage)}</strong>
            <Pill>Medication started · {event.date}</Pill>
          </div>
          <div className="a-meta">{join(event.medication.frequency, `(${event.medication.status})`)}</div>
          <Link className="a-btn a-btn-sm" to="/medications" aria-label={`Open medication ${event.medication.medication_name}`}>
            Open in Medications
          </Link>
        </article>
      );
    case 'lab_panel':
      return (
        <article className="a-card tl-card">
          <div className="a-item-top">
            <strong>{event.facility_name || 'Lab results'}</strong>
            <Pill>Lab results · {event.date}</Pill>
          </div>
          {event.lab_results.map((r) => (
            <div key={r.result_id} className="a-note">
              {test(r)}
            </div>
          ))}
          <Link className="a-btn a-btn-sm" to="/lab-results" aria-label={`Open lab results from ${event.date}`}>
            Open in Lab Results
          </Link>
        </article>
      );
    case 'document':
      return (
        <article className="a-card tl-card">
          <div className="a-item-top">
            <strong>{event.document.file_name}</strong>
            <Pill>Document · {event.date}</Pill>
          </div>
          <div className="a-meta">{DOCUMENT_TYPE_LABELS[event.document.document_type]}</div>
          <Link className="a-btn a-btn-sm" to="/documents" aria-label={`Open document ${event.document.file_name}`}>
            Open in Documents
          </Link>
        </article>
      );
  }
}

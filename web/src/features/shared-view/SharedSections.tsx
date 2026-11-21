import { useState } from 'react';
import { errorMessage } from '../../api/client';
import { sharedApi } from '../../api/shared';
import { Pill } from '../../components/ui/Pill';
import { DOCUMENT_TYPE_LABELS, type Allergy, type Condition, type LabResult, type MedicalDocument, type Medication, type Visit } from '../../types/records';
import { formatDate } from '../../utils/dates';

// Read-only views of each kind of record, as a doctor sees them on a shared link.

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="sv-section" aria-label={title}>
      <h2>
        {title} <span className="a-muted">({count})</span>
      </h2>
      {count === 0 ? <p className="a-muted">Nothing recorded.</p> : <div className="sv-list">{children}</div>}
    </section>
  );
}

const severityTone = { severe: 'red', moderate: 'warn', mild: 'blue' } as const;

export function AllergiesSection({ items }: { items: Allergy[] }) {
  return (
    <Section title="Allergies" count={items.length}>
      {items.map((a) => (
        <article key={a.allergy_id} className="a-card sv-card">
          <div className="a-item-top">
            <strong>{a.allergen}</strong>
            {a.severity && <Pill tone={severityTone[a.severity]}>{a.severity}</Pill>}
          </div>
          {a.reaction && <div className="a-meta">Reaction: {a.reaction}</div>}
          <div className="a-meta">{a.status}</div>
        </article>
      ))}
    </Section>
  );
}

export function ConditionsSection({ items }: { items: Condition[] }) {
  return (
    <Section title="Conditions" count={items.length}>
      {items.map((c) => (
        <article key={c.condition_id} className="a-card sv-card">
          <div className="a-item-top">
            <strong>{c.condition_name}</strong>
            <Pill>{c.status}</Pill>
          </div>
          {c.diagnosis_date && <div className="a-meta">Diagnosed {formatDate(c.diagnosis_date)}</div>}
          {c.notes && <div className="a-note">{c.notes}</div>}
        </article>
      ))}
    </Section>
  );
}

export function VisitsSection({ items }: { items: Visit[] }) {
  return (
    <Section title="Visits" count={items.length}>
      {items.map((v) => (
        <article key={v.visit_id} className="a-card sv-card">
          <div className="a-item-top">
            <strong>{v.facility_name || 'Visit'}</strong>
            <Pill tone="blue">{formatDate(v.visit_date)}</Pill>
          </div>
          {v.reason && <div className="a-meta">Reason: {v.reason}</div>}
          {v.diagnosis && <div className="a-note">Diagnosis: {v.diagnosis}</div>}
          {v.treatment && <div className="a-note">Treatment: {v.treatment}</div>}
          {v.notes && <div className="a-meta">{v.notes}</div>}
        </article>
      ))}
    </Section>
  );
}

export function MedicationsSection({ items }: { items: Medication[] }) {
  return (
    <Section title="Medications" count={items.length}>
      {items.map((m) => (
        <article key={m.medication_id} className="a-card sv-card">
          <div className="a-item-top">
            <strong>{[m.medication_name, m.dosage].filter(Boolean).join(' ')}</strong>
            <Pill tone={m.status === 'active' ? 'green' : undefined}>{m.status}</Pill>
          </div>
          {m.frequency && <div className="a-meta">{m.frequency}</div>}
          <div className="a-meta">
            From {formatDate(m.start_date)}
            {m.end_date ? ` to ${formatDate(m.end_date)}` : ''}
          </div>
        </article>
      ))}
    </Section>
  );
}

export function LabResultsSection({ items }: { items: LabResult[] }) {
  return (
    <Section title="Lab results" count={items.length}>
      {items.map((r) => (
        <article key={r.result_id} className="a-card sv-card">
          <div className="a-item-top">
            <strong>{r.test_name}</strong>
            <Pill>{formatDate(r.test_date)}</Pill>
          </div>
          {r.result && <div className="a-note">Result: {r.result}</div>}
          {r.reference_range && <div className="a-meta">Normal range: {r.reference_range}</div>}
          {r.facility_name && <div className="a-meta">{r.facility_name}</div>}
        </article>
      ))}
    </Section>
  );
}

function DocumentRow({ token, doc }: { token: string; doc: MedicalDocument }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function open() {
    setBusy(true);
    setError('');
    try {
      await sharedApi.download(token, doc);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="a-card sv-card">
      <div className="a-item-top">
        <strong>{doc.file_name}</strong>
        <Pill>{DOCUMENT_TYPE_LABELS[doc.document_type]}</Pill>
      </div>
      {doc.description && <div className="a-note">{doc.description}</div>}
      <div className="a-meta">{doc.document_date ? `Dated ${formatDate(doc.document_date)}` : `Added ${formatDate(doc.upload_date.slice(0, 10))}`}</div>
      {error && (
        <p className="a-error" role="alert">
          ⚠ {error}
        </p>
      )}
      <div className="a-actions sv-noprint">
        <button type="button" className="a-btn a-btn-sm" onClick={open} disabled={busy} aria-label={`Download ${doc.file_name}`}>
          {busy ? 'Downloading…' : 'Download'}
        </button>
      </div>
    </article>
  );
}

export function DocumentsSection({ token, items }: { token: string; items: MedicalDocument[] }) {
  return (
    <Section title="Documents" count={items.length}>
      {items.map((d) => (
        <DocumentRow key={d.document_id} token={token} doc={d} />
      ))}
    </Section>
  );
}

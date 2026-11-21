import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type DocumentType } from '../../types/records';
import { newId, type Extras } from './extras';
import './VisitExtras.css';

type Props = { extras: Extras; onChange: (extras: Extras) => void };

// The "what came out of this visit?" part of the add-visit form.
export function VisitExtrasFields({ extras, onChange }: Props) {
  const patch = (p: Partial<Extras>) => onChange({ ...extras, ...p });

  return (
    <fieldset className="visit-extras">
      <legend>What came out of this visit? (optional)</legend>
      <p className="a-muted">Add the diagnosis, medicines, tests and papers from this visit. They are saved together and linked to it.</p>

      <h3>Diagnoses</h3>
      {extras.diagnoses.map((d, i) => (
        <div key={d.id} className="a-row visit-extra-row">
          <label className="a-field">
            <span>Diagnosis {i + 1}</span>
            <input value={d.name} maxLength={200} placeholder="e.g. Malaria" onChange={(e) => patch({ diagnoses: extras.diagnoses.map((x) => (x.id === d.id ? { ...x, name: e.target.value } : x)) })} />
          </label>
          <button type="button" className="a-btn a-btn-sm a-btn-danger" aria-label={`Remove diagnosis ${i + 1}`} onClick={() => patch({ diagnoses: extras.diagnoses.filter((x) => x.id !== d.id) })}>
            ✕
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="a-btn a-btn-sm" onClick={() => patch({ diagnoses: [...extras.diagnoses, { id: newId(), name: '' }] })}>
          + Add a diagnosis
        </button>
      </div>

      <h3>Prescriptions</h3>
      {extras.prescriptions.map((p, i) => {
        const set = (change: Partial<typeof p>) => patch({ prescriptions: extras.prescriptions.map((x) => (x.id === p.id ? { ...x, ...change } : x)) });
        return (
          <div key={p.id} className="a-row visit-extra-row">
            <label className="a-field">
              <span>Medicine {i + 1}</span>
              <input value={p.name} maxLength={200} placeholder="e.g. Coartem" onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label className="a-field">
              <span>Dosage {i + 1} (optional)</span>
              <input value={p.dosage} maxLength={200} placeholder="e.g. 4 tablets" onChange={(e) => set({ dosage: e.target.value })} />
            </label>
            <label className="a-field">
              <span>How often {i + 1} (optional)</span>
              <input value={p.frequency} maxLength={200} placeholder="e.g. Twice daily" onChange={(e) => set({ frequency: e.target.value })} />
            </label>
            <button type="button" className="a-btn a-btn-sm a-btn-danger" aria-label={`Remove prescription ${i + 1}`} onClick={() => patch({ prescriptions: extras.prescriptions.filter((x) => x.id !== p.id) })}>
              ✕
            </button>
          </div>
        );
      })}
      <div>
        <button type="button" className="a-btn a-btn-sm" onClick={() => patch({ prescriptions: [...extras.prescriptions, { id: newId(), name: '', dosage: '', frequency: '' }] })}>
          + Add a prescription
        </button>
      </div>

      <h3>Tests</h3>
      {extras.tests.map((t, i) => {
        const set = (change: Partial<typeof t>) => patch({ tests: extras.tests.map((x) => (x.id === t.id ? { ...x, ...change } : x)) });
        return (
          <div key={t.id} className="a-row visit-extra-row">
            <label className="a-field">
              <span>Test {i + 1}</span>
              <input value={t.name} maxLength={200} placeholder="e.g. Malaria film" onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label className="a-field">
              <span>Result {i + 1} (optional)</span>
              <input value={t.result} maxLength={1000} placeholder="e.g. Positive" onChange={(e) => set({ result: e.target.value })} />
            </label>
            <label className="a-field">
              <span>Normal range {i + 1} (optional)</span>
              <input value={t.range} maxLength={200} placeholder="e.g. 12 - 16 g/dL" onChange={(e) => set({ range: e.target.value })} />
            </label>
            <button type="button" className="a-btn a-btn-sm a-btn-danger" aria-label={`Remove test ${i + 1}`} onClick={() => patch({ tests: extras.tests.filter((x) => x.id !== t.id) })}>
              ✕
            </button>
          </div>
        );
      })}
      <div>
        <button type="button" className="a-btn a-btn-sm" onClick={() => patch({ tests: [...extras.tests, { id: newId(), name: '', result: '', range: '' }] })}>
          + Add a test
        </button>
      </div>

      <h3>Documents</h3>
      {extras.documents.map((d) => (
        <div key={d.id} className="a-row visit-extra-row">
          <span className="visit-file" aria-label={`Attached: ${d.file.name}`}>
            {d.file.name}
          </span>
          <label className="a-field">
            <span>What is {d.file.name}?</span>
            <select value={d.type} onChange={(e) => patch({ documents: extras.documents.map((x) => (x.id === d.id ? { ...x, type: e.target.value as DocumentType } : x)) })}>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="a-btn a-btn-sm a-btn-danger" aria-label={`Remove ${d.file.name}`} onClick={() => patch({ documents: extras.documents.filter((x) => x.id !== d.id) })}>
            ✕
          </button>
        </div>
      ))}
      <label className="a-field">
        <span>Attach a file (PDF or photo, up to 10 MB)</span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) patch({ documents: [...extras.documents, { id: newId(), file, type: 'other' }] });
            e.target.value = '';
          }}
        />
      </label>
    </fieldset>
  );
}

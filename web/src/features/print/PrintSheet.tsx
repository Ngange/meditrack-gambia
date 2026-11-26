import { DOCUMENT_TYPE_LABELS, type Allergy, type Condition, type LabResult, type MedicalDocument, type Medication, type Visit } from '../../types/records';
import { formatDate } from '../../utils/dates';
import './Print.css';

export type SheetPatient = {
  first_name: string;
  last_name: string;
  blood_group?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
};

// The sections to print. A section that is left out is not printed at all (that is how a shared link
// prints only what the patient chose to share); a section that is there but empty says "Nothing recorded".
export type SheetSections = {
  allergies?: Allergy[];
  conditions?: Condition[];
  visits?: Visit[];
  medications?: Medication[];
  lab_results?: LabResult[];
  documents?: MedicalDocument[];
};

const dash = (v: string | null | undefined) => v || '-';
const day = (v: string | null | undefined) => (v ? formatDate(v) : '-');
const cap = (v: string | null | undefined) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : '-');

function Block({ title, count, head, children }: { title: string; count: number; head: string[]; children: React.ReactNode }) {
  return (
    <section className="pr-block">
      <h2>
        {title} ({count})
      </h2>
      {count === 0 ? (
        <p className="pr-none">Nothing recorded.</p>
      ) : (
        <table>
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      )}
    </section>
  );
}

/**
 * A plain, black-on-white record sheet made for paper (A4). Used by the patient's own print page,
 * the doctor's print page, and the shared-link page. `note` is the line under the heading
 * (who printed it, or when a shared link ends).
 */
export function PrintSheet({ patient, sections, note }: { patient: SheetPatient; sections: SheetSections; note: string }) {
  const s = sections;
  const printedOn = new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
  const hasContact = 'emergency_contact_name' in patient;
  return (
    <article className="pr-sheet">
      <header className="pr-head">
        <div>
          <strong className="pr-brand">MediTrack Gambia</strong>
          <div>Patient medical record</div>
        </div>
        <div className="pr-printed">Printed {printedOn}</div>
      </header>

      <section className="pr-patient">
        <h1>
          {patient.first_name} {patient.last_name}
        </h1>
        <dl>
          <div>
            <dt>Blood group</dt>
            <dd>{dash(patient.blood_group)}</dd>
          </div>
          {'date_of_birth' in patient && (
            <div>
              <dt>Date of birth</dt>
              <dd>{day(patient.date_of_birth)}</dd>
            </div>
          )}
          {'gender' in patient && (
            <div>
              <dt>Gender</dt>
              <dd>{dash(patient.gender)}</dd>
            </div>
          )}
          {hasContact && (
            <div>
              <dt>Emergency contact</dt>
              <dd>
                {dash(patient.emergency_contact_name)}
                {patient.emergency_contact_phone ? `, ${patient.emergency_contact_phone}` : ''}
              </dd>
            </div>
          )}
        </dl>
        <p className="pr-note">{note}</p>
      </section>

      {s.allergies && (
        <Block title="Allergies" count={s.allergies.length} head={['Allergen', 'Reaction', 'Severity', 'Status']}>
          {s.allergies.map((a) => (
            <tr key={a.allergy_id}>
              <td>{a.allergen}</td>
              <td>{dash(a.reaction)}</td>
              <td>{cap(a.severity)}</td>
              <td>{cap(a.status)}</td>
            </tr>
          ))}
        </Block>
      )}
      {s.conditions && (
        <Block title="Conditions" count={s.conditions.length} head={['Condition', 'Status', 'Diagnosed', 'Notes']}>
          {s.conditions.map((c) => (
            <tr key={c.condition_id}>
              <td>{c.condition_name}</td>
              <td>{cap(c.status)}</td>
              <td>{day(c.diagnosis_date)}</td>
              <td>{dash(c.notes)}</td>
            </tr>
          ))}
        </Block>
      )}
      {s.medications && (
        <Block title="Medications" count={s.medications.length} head={['Medication', 'Dosage', 'How often', 'From', 'To', 'Status']}>
          {s.medications.map((m) => (
            <tr key={m.medication_id}>
              <td>{m.medication_name}</td>
              <td>{dash(m.dosage)}</td>
              <td>{dash(m.frequency)}</td>
              <td>{day(m.start_date)}</td>
              <td>{day(m.end_date)}</td>
              <td>{cap(m.status)}</td>
            </tr>
          ))}
        </Block>
      )}
      {s.visits && (
        <Block title="Visits" count={s.visits.length} head={['Date', 'Facility', 'Reason', 'Diagnosis', 'Treatment']}>
          {s.visits.map((v) => (
            <tr key={v.visit_id}>
              <td>{day(v.visit_date)}</td>
              <td>{dash(v.facility_name)}</td>
              <td>{dash(v.reason)}</td>
              <td>{dash(v.diagnosis)}</td>
              <td>{dash(v.treatment)}</td>
            </tr>
          ))}
        </Block>
      )}
      {s.lab_results && (
        <Block title="Lab results" count={s.lab_results.length} head={['Date', 'Test', 'Result', 'Normal range', 'Laboratory']}>
          {s.lab_results.map((r) => (
            <tr key={r.result_id}>
              <td>{day(r.test_date)}</td>
              <td>{r.test_name}</td>
              <td>{dash(r.result)}</td>
              <td>{dash(r.reference_range)}</td>
              <td>{dash(r.facility_name)}</td>
            </tr>
          ))}
        </Block>
      )}
      {s.documents && (
        <Block title="Documents on file" count={s.documents.length} head={['Date', 'File', 'Type', 'Description']}>
          {s.documents.map((d) => (
            <tr key={d.document_id}>
              <td>{day(d.document_date ?? d.upload_date.slice(0, 10))}</td>
              <td>{d.file_name}</td>
              <td>{DOCUMENT_TYPE_LABELS[d.document_type]}</td>
              <td>{dash(d.description)}</td>
            </tr>
          ))}
        </Block>
      )}
      {s.documents && s.documents.length > 0 && <p className="pr-note">Only the list of documents is printed. Open the files in MediTrack to print an X-ray or a report.</p>}

      <footer className="pr-foot">Confidential medical information. Handle it with care and do not share it without the patient's permission.</footer>
    </article>
  );
}

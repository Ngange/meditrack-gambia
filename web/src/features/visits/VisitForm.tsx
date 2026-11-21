import { useState } from 'react';
import { FormRow } from '../../components/forms/FormRow';
import { TextField } from '../../components/forms/TextField';
import { RecordForm } from '../../components/records/RecordForm';
import type { RecordFormProps } from '../../components/records/types';
import { useFormState } from '../../hooks/useFormState';
import type { Visit } from '../../types/records';
import { today } from '../../utils/dates';
import { checkExtras, emptyExtras, type Extras } from './extras';
import { LinkedRecords } from './LinkedRecords';
import type { VisitFormInput } from './saveVisit';
import { validateVisit } from './validation';
import { VisitExtrasFields } from './VisitExtrasFields';

export function VisitForm({ initial, saving, error, onSubmit, onCancel }: RecordFormProps<Visit, VisitFormInput>) {
  const { values, bind } = useFormState({
    date: initial?.visit_date ?? today(),
    facility: initial?.facility_name ?? '',
    reason: initial?.reason ?? '',
    diagnosis: initial?.diagnosis ?? '',
    treatment: initial?.treatment ?? '',
    notes: initial?.notes ?? '',
  });
  const [localError, setLocalError] = useState('');
  const [extras, setExtras] = useState<Extras>(emptyExtras);

  function submit() {
    const problem = validateVisit(values);
    setLocalError(problem ?? '');
    if (problem) return;
    const checked = initial ? undefined : checkExtras(extras);
    if (checked?.error) return setLocalError(checked.error);
    onSubmit({
      facilityName: values.facility.trim(),
      visitDate: values.date,
      reason: values.reason.trim(),
      diagnosis: values.diagnosis.trim(),
      treatment: values.treatment.trim(),
      notes: values.notes.trim(),
      extras: checked,
    });
  }

  return (
    <RecordForm
      noun="visit"
      isNew={!initial}
      saving={saving}
      error={localError || error}
      onSubmit={submit}
      onCancel={onCancel}>
      <FormRow>
        <TextField label="Date of visit" type="date" max={today()} {...bind('date')} />
        <TextField
          label="Clinic or hospital"
          placeholder="e.g. Edward Francis Small Teaching Hospital"
          maxLength={200}
          autoFocus
          {...bind('facility')}
        />
      </FormRow>
      <TextField label="Reason for visit" placeholder="e.g. Routine blood pressure check" maxLength={1000} {...bind('reason')} />
      <FormRow>
        <TextField label="Diagnosis (optional)" placeholder="e.g. Hypertension (controlled)" maxLength={1000} {...bind('diagnosis')} />
        <TextField label="Treatment (optional)" placeholder="e.g. Continue Amlodipine 5mg daily" maxLength={2000} {...bind('treatment')} />
      </FormRow>
      <TextField label="Notes (optional)" maxLength={2000} {...bind('notes')} />
      {initial ? <LinkedRecords visitId={initial.visit_id} /> : <VisitExtrasFields extras={extras} onChange={setExtras} />}
    </RecordForm>
  );
}

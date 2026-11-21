import { useState } from 'react';
import { FormRow } from '../../components/forms/FormRow';
import { SelectField } from '../../components/forms/SelectField';
import { TextField } from '../../components/forms/TextField';
import { RecordForm } from '../../components/records/RecordForm';
import type { RecordFormProps } from '../../components/records/types';
import { VisitPicker } from '../visits/VisitPicker';
import { useFormState } from '../../hooks/useFormState';
import type { Condition, ConditionInput, ConditionStatus } from '../../types/records';
import { today } from '../../utils/dates';
import { validateCondition } from './validation';

const STATUSES = ['active', 'chronic', 'resolved'] as const;

export function ConditionForm({ initial, saving, error, onSubmit, onCancel }: RecordFormProps<Condition, ConditionInput>) {
  const { values, bind } = useFormState({
    name: initial?.condition_name ?? '',
    date: initial?.diagnosis_date ?? '',
    status: initial?.status ?? 'active',
    notes: initial?.notes ?? '',
  });
  const [localError, setLocalError] = useState('');
  const [visitId, setVisitId] = useState<string | null>(initial?.visit_id ?? null);

  function submit() {
    const problem = validateCondition(values);
    setLocalError(problem ?? '');
    if (problem) return;
    onSubmit({
      visitId,
      conditionName: values.name.trim(),
      diagnosisDate: values.date,
      status: values.status as ConditionStatus,
      notes: values.notes.trim(),
    });
  }

  return (
    <RecordForm
      noun="condition"
      isNew={!initial}
      saving={saving}
      error={localError || error}
      onSubmit={submit}
      onCancel={onCancel}>
      <TextField label="Condition" placeholder="e.g. Type 2 diabetes, hypertension" maxLength={200} autoFocus {...bind('name')} />
      <FormRow>
        <TextField label="Date diagnosed (optional)" type="date" max={today()} {...bind('date')} />
        <SelectField label="Status" options={STATUSES} {...bind('status')} />
      </FormRow>
      <TextField label="Notes (optional)" placeholder="e.g. Managed with diet and medication" maxLength={2000} {...bind('notes')} />
      <VisitPicker value={visitId} onChange={setVisitId} />
    </RecordForm>
  );
}

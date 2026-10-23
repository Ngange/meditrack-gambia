import { useState } from 'react';
import { FormRow } from '../../components/forms/FormRow';
import { SelectField } from '../../components/forms/SelectField';
import { TextField } from '../../components/forms/TextField';
import { RecordForm } from '../../components/records/RecordForm';
import type { RecordFormProps } from '../../components/records/types';
import { useFormState } from '../../hooks/useFormState';
import type { Allergy, AllergyInput, AllergyStatus, Severity } from '../../types/records';
import { validateAllergy } from './validation';

const SEVERITIES = ['mild', 'moderate', 'severe'] as const;
const STATUSES = ['active', 'resolved'] as const;

export function AllergyForm({ initial, saving, error, onSubmit, onCancel }: RecordFormProps<Allergy, AllergyInput>) {
  const { values, bind } = useFormState({
    allergen: initial?.allergen ?? '',
    reaction: initial?.reaction ?? '',
    severity: initial?.severity ?? '',
    status: initial?.status ?? 'active',
  });
  const [localError, setLocalError] = useState('');

  function submit() {
    const problem = validateAllergy(values);
    setLocalError(problem ?? '');
    if (problem) return;
    onSubmit({
      allergen: values.allergen.trim(),
      reaction: values.reaction.trim(),
      severity: (values.severity || null) as Severity | null,
      status: values.status as AllergyStatus,
    });
  }

  return (
    <RecordForm
      noun="allergy"
      isNew={!initial}
      saving={saving}
      error={localError || error}
      onSubmit={submit}
      onCancel={onCancel}>
      <TextField label="Allergen" placeholder="e.g. Penicillin, peanuts" maxLength={200} autoFocus {...bind('allergen')} />
      <TextField label="Reaction (optional)" placeholder="e.g. Rash, swelling" maxLength={1000} {...bind('reaction')} />
      <FormRow>
        <SelectField label="Severity (optional)" options={SEVERITIES} placeholder="Not specified" {...bind('severity')} />
        <SelectField label="Status" options={STATUSES} {...bind('status')} />
      </FormRow>
    </RecordForm>
  );
}

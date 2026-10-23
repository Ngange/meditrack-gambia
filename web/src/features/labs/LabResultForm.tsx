import { useState } from 'react';
import { FormRow } from '../../components/forms/FormRow';
import { TextField } from '../../components/forms/TextField';
import { RecordForm } from '../../components/records/RecordForm';
import type { RecordFormProps } from '../../components/records/types';
import { useFormState } from '../../hooks/useFormState';
import type { LabResult, LabResultInput } from '../../types/records';
import { today } from '../../utils/dates';
import { validateLabResult } from './validation';

export function LabResultForm({ initial, saving, error, onSubmit, onCancel }: RecordFormProps<LabResult, LabResultInput>) {
  const { values, bind } = useFormState({
    testName: initial?.test_name ?? '',
    testDate: initial?.test_date ?? today(),
    result: initial?.result ?? '',
    referenceRange: initial?.reference_range ?? '',
    facility: initial?.facility_name ?? '',
  });
  const [localError, setLocalError] = useState('');

  function submit() {
    const problem = validateLabResult(values);
    setLocalError(problem ?? '');
    if (problem) return;
    onSubmit({
      testName: values.testName.trim(),
      testDate: values.testDate,
      result: values.result.trim(),
      referenceRange: values.referenceRange.trim(),
      facilityName: values.facility.trim(),
    });
  }

  return (
    <RecordForm
      noun="lab result"
      isNew={!initial}
      saving={saving}
      error={localError || error}
      onSubmit={submit}
      onCancel={onCancel}>
      <FormRow>
        <TextField label="Test" placeholder="e.g. Fasting blood glucose" maxLength={200} autoFocus {...bind('testName')} />
        <TextField label="Date of test" type="date" max={today()} {...bind('testDate')} />
      </FormRow>
      <FormRow>
        <TextField label="Result (optional)" placeholder="e.g. 5.4 mmol/L" maxLength={1000} {...bind('result')} />
        <TextField label="Normal range (optional)" placeholder="e.g. 3.9 - 5.5 mmol/L" maxLength={200} {...bind('referenceRange')} />
      </FormRow>
      <TextField label="Lab or facility (optional)" placeholder="e.g. EFSTH Laboratory" maxLength={200} {...bind('facility')} />
    </RecordForm>
  );
}

import { useState } from 'react';

import { RecordFormScreen } from '@/components/records/RecordFormScreen';
import { Input } from '@/components/ui/input';
import { useFormState } from '@/hooks/useFormState';
import { useRecordForm } from '@/hooks/useRecordForm';
import { useRouteItem } from '@/hooks/useRouteItem';
import { todayLocal } from '@/utils/dates';

import { labResultApi } from './api';
import type { LabResult } from './types';
import { validateLabResult, type LabResultErrors } from './validation';

export function LabResultFormScreen() {
  const lab = useRouteItem<LabResult>();
  const form = useRecordForm(labResultApi, lab?.result_id);
  const { values, bind } = useFormState({
    testName: lab?.test_name ?? '',
    testDate: lab?.test_date ?? todayLocal(),
    result: lab?.result ?? '',
    referenceRange: lab?.reference_range ?? '',
    facility: lab?.facility_name ?? '',
  });
  const [errors, setErrors] = useState<LabResultErrors>({});

  function handleSave() {
    const result = validateLabResult(values);
    setErrors(result.errors);
    if (result.input) void form.submit(result.input);
  }

  return (
    <RecordFormScreen
      noun="lab result"
      {...form}
      onSave={handleSave}
      onDelete={() => form.confirmRemove('Delete lab result', `Remove "${values.testName}" from your records?`)}>
      <Input label="Test" placeholder="e.g. Fasting blood glucose" error={errors.testName} {...bind('testName')} />
      <Input
        label="Date of test"
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        error={errors.testDate}
        {...bind('testDate')}
      />
      <Input label="Result (optional)" placeholder="e.g. 5.4 mmol/L" {...bind('result')} />
      <Input label="Normal range (optional)" placeholder="e.g. 3.9 - 5.5 mmol/L" {...bind('referenceRange')} />
      <Input label="Lab or facility (optional)" placeholder="e.g. EFSTH Laboratory" {...bind('facility')} />
    </RecordFormScreen>
  );
}

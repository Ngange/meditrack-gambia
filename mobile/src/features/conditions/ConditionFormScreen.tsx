import { useState } from 'react';

import { RecordFormScreen } from '@/components/records/RecordFormScreen';
import { ChipGroup } from '@/components/ui/chip-group';
import { Input } from '@/components/ui/input';
import { useFormState } from '@/hooks/useFormState';
import { useRecordForm } from '@/hooks/useRecordForm';
import { useRouteItem } from '@/hooks/useRouteItem';

import { conditionApi } from './api';
import { CONDITION_STATUSES, type Condition } from './types';
import { validateCondition, type ConditionErrors } from './validation';

export function ConditionFormScreen() {
  const condition = useRouteItem<Condition>();
  const form = useRecordForm(conditionApi, condition?.condition_id);
  const { values, set, bind } = useFormState({
    name: condition?.condition_name ?? '',
    date: condition?.diagnosis_date ?? '',
    notes: condition?.notes ?? '',
    status: condition?.status ?? 'active',
  });
  const [errors, setErrors] = useState<ConditionErrors>({});

  function handleSave() {
    const result = validateCondition(values);
    setErrors(result.errors);
    if (result.input) void form.submit(result.input);
  }

  return (
    <RecordFormScreen
      noun="condition"
      {...form}
      onSave={handleSave}
      onDelete={() => form.confirmRemove('Delete condition', `Remove "${values.name}" from your records?`)}>
      <Input
        label="Condition"
        placeholder="e.g. Type 2 diabetes, hypertension"
        error={errors.name}
        {...bind('name')}
      />
      <Input
        label="Date diagnosed (optional)"
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        error={errors.date}
        {...bind('date')}
      />
      <ChipGroup
        label="Status"
        options={CONDITION_STATUSES}
        value={values.status}
        onChange={(v) => v && set('status', v)}
      />
      <Input label="Notes (optional)" placeholder="e.g. Managed with diet and medication" {...bind('notes')} />
    </RecordFormScreen>
  );
}

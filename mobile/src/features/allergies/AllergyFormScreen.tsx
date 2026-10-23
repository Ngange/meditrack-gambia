import { useState } from 'react';

import { RecordFormScreen } from '@/components/records/RecordFormScreen';
import { ChipGroup } from '@/components/ui/chip-group';
import { Input } from '@/components/ui/input';
import { useFormState } from '@/hooks/useFormState';
import { useRecordForm } from '@/hooks/useRecordForm';
import { useRouteItem } from '@/hooks/useRouteItem';

import { allergyApi } from './api';
import { ALLERGY_STATUSES, SEVERITIES, type Allergy } from './types';
import { validateAllergy, type AllergyErrors } from './validation';

export function AllergyFormScreen() {
  const allergy = useRouteItem<Allergy>();
  const form = useRecordForm(allergyApi, allergy?.allergy_id);
  const { values, set, bind } = useFormState({
    allergen: allergy?.allergen ?? '',
    reaction: allergy?.reaction ?? '',
    severity: allergy?.severity ?? null,
    status: allergy?.status ?? 'active',
  });
  const [errors, setErrors] = useState<AllergyErrors>({});

  function handleSave() {
    const result = validateAllergy(values);
    setErrors(result.errors);
    if (result.input) void form.submit(result.input);
  }

  return (
    <RecordFormScreen
      noun="allergy"
      {...form}
      onSave={handleSave}
      onDelete={() => form.confirmRemove('Delete allergy', `Remove "${values.allergen}" from your records?`)}>
      <Input
        label="Allergen"
        placeholder="e.g. Penicillin, peanuts"
        error={errors.allergen}
        {...bind('allergen')}
      />
      <Input label="Reaction (optional)" placeholder="e.g. Rash, swelling" {...bind('reaction')} />
      <ChipGroup
        label="Severity (optional)"
        options={SEVERITIES}
        value={values.severity}
        onChange={(v) => set('severity', v)}
        clearable
      />
      <ChipGroup
        label="Status"
        options={ALLERGY_STATUSES}
        value={values.status}
        onChange={(v) => v && set('status', v)}
      />
    </RecordFormScreen>
  );
}

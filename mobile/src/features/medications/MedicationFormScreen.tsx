import { useState } from 'react';

import { RecordFormScreen } from '@/components/records/RecordFormScreen';
import { ChipGroup } from '@/components/ui/chip-group';
import { Input } from '@/components/ui/input';
import { useFormState } from '@/hooks/useFormState';
import { useRecordForm } from '@/hooks/useRecordForm';
import { useRouteItem } from '@/hooks/useRouteItem';
import { todayLocal } from '@/utils/dates';

import { medicationApi } from './api';
import { ReminderTimesField } from './ReminderTimesField';
import { MEDICATION_STATUSES, type Medication } from './types';
import { validateMedication, type MedicationErrors } from './validation';

export function MedicationFormScreen() {
  const medication = useRouteItem<Medication>();
  const form = useRecordForm(medicationApi, medication?.medication_id);
  const { values, set, bind } = useFormState({
    name: medication?.medication_name ?? '',
    dosage: medication?.dosage ?? '',
    frequency: medication?.frequency ?? '',
    start: medication?.start_date ?? todayLocal(),
    end: medication?.end_date ?? '',
    status: medication?.status ?? 'active',
    reminders: medication?.reminder_times ?? [],
  });
  const [errors, setErrors] = useState<MedicationErrors>({});

  function handleSave() {
    const result = validateMedication(values);
    setErrors(result.errors);
    if (result.input) void form.submit(result.input);
  }

  return (
    <RecordFormScreen
      noun="medication"
      {...form}
      onSave={handleSave}
      onDelete={() => form.confirmRemove('Delete medication', `Remove "${values.name}" from your records?`)}>
      <Input label="Medication" placeholder="e.g. Amlodipine Besylate" error={errors.name} {...bind('name')} />
      <Input label="Dosage (optional)" placeholder="e.g. 5mg" {...bind('dosage')} />
      <Input label="How often (optional)" placeholder="e.g. Twice daily" {...bind('frequency')} />
      <Input
        label="Start date"
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        error={errors.start}
        {...bind('start')}
      />
      <Input
        label="End date (optional)"
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        error={errors.end}
        {...bind('end')}
      />
      <ChipGroup
        label="Status"
        options={MEDICATION_STATUSES}
        value={values.status}
        onChange={(v) => v && set('status', v)}
      />
      <ReminderTimesField value={values.reminders} onChange={(times) => set('reminders', times)} />
    </RecordFormScreen>
  );
}

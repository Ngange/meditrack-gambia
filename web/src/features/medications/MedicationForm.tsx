import { useState } from 'react';
import { FormRow } from '../../components/forms/FormRow';
import { SelectField } from '../../components/forms/SelectField';
import { TextField } from '../../components/forms/TextField';
import { RecordForm } from '../../components/records/RecordForm';
import type { RecordFormProps } from '../../components/records/types';
import { useFormState } from '../../hooks/useFormState';
import type { Medication, MedicationInput, MedicationStatus } from '../../types/records';
import { today } from '../../utils/dates';
import { parseReminderTimes, validateMedication } from './validation';

const STATUSES = ['active', 'completed', 'discontinued'] as const;

export function MedicationForm({ initial, saving, error, onSubmit, onCancel }: RecordFormProps<Medication, MedicationInput>) {
  const { values, bind } = useFormState({
    name: initial?.medication_name ?? '',
    dosage: initial?.dosage ?? '',
    frequency: initial?.frequency ?? '',
    start: initial?.start_date ?? today(),
    end: initial?.end_date ?? '',
    status: initial?.status ?? 'active',
    reminders: (initial?.reminder_times ?? []).join(', '),
  });
  const [localError, setLocalError] = useState('');

  function submit() {
    const problem = validateMedication(values);
    setLocalError(problem ?? '');
    if (problem) return;
    onSubmit({
      medicationName: values.name.trim(),
      dosage: values.dosage.trim(),
      frequency: values.frequency.trim(),
      startDate: values.start,
      endDate: values.end,
      status: values.status as MedicationStatus,
      reminderTimes: parseReminderTimes(values.reminders).times,
    });
  }

  return (
    <RecordForm
      noun="medication"
      isNew={!initial}
      saving={saving}
      error={localError || error}
      onSubmit={submit}
      onCancel={onCancel}>
      <TextField label="Medication" placeholder="e.g. Amlodipine Besylate" maxLength={200} autoFocus {...bind('name')} />
      <FormRow>
        <TextField label="Dosage (optional)" placeholder="e.g. 5mg" maxLength={200} {...bind('dosage')} />
        <TextField label="How often (optional)" placeholder="e.g. Twice daily" maxLength={200} {...bind('frequency')} />
      </FormRow>
      <FormRow>
        <TextField label="Start date" type="date" {...bind('start')} />
        <TextField label="End date (optional)" type="date" min={values.start || undefined} {...bind('end')} />
        <SelectField label="Status" options={STATUSES} {...bind('status')} />
      </FormRow>
      <TextField
        label="Reminder times on your phone (optional)"
        placeholder="e.g. 08:00, 20:00"
        maxLength={60}
        {...bind('reminders')}
      />
    </RecordForm>
  );
}

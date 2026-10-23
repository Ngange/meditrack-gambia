import { useState } from 'react';

import { RecordFormScreen } from '@/components/records/RecordFormScreen';
import { Input } from '@/components/ui/input';
import { useFormState } from '@/hooks/useFormState';
import { useRecordForm } from '@/hooks/useRecordForm';
import { useRouteItem } from '@/hooks/useRouteItem';
import { todayLocal } from '@/utils/dates';

import { visitApi } from './api';
import type { Visit } from './types';
import { validateVisit, type VisitErrors } from './validation';

export function VisitFormScreen() {
  const visit = useRouteItem<Visit>();
  const form = useRecordForm(visitApi, visit?.visit_id);
  const { values, bind } = useFormState({
    facility: visit?.facility_name ?? '',
    date: visit?.visit_date ?? todayLocal(),
    reason: visit?.reason ?? '',
    diagnosis: visit?.diagnosis ?? '',
    treatment: visit?.treatment ?? '',
    notes: visit?.notes ?? '',
  });
  const [errors, setErrors] = useState<VisitErrors>({});

  function handleSave() {
    const result = validateVisit(values);
    setErrors(result.errors);
    if (result.input) void form.submit(result.input);
  }

  return (
    <RecordFormScreen
      noun="visit"
      {...form}
      formError={form.formError || errors.form || ''}
      onSave={handleSave}
      onDelete={() => form.confirmRemove('Delete visit', 'Remove this visit from your records?')}>
      <Input
        label="Date of visit"
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        error={errors.date}
        {...bind('date')}
      />
      <Input
        label="Clinic or hospital"
        placeholder="e.g. Edward Francis Small Teaching Hospital"
        {...bind('facility')}
      />
      <Input label="Reason for visit" placeholder="e.g. Routine blood pressure check" {...bind('reason')} />
      <Input label="Diagnosis (optional)" placeholder="e.g. Hypertension (controlled)" {...bind('diagnosis')} />
      <Input label="Treatment (optional)" placeholder="e.g. Continue Amlodipine 5mg daily" {...bind('treatment')} />
      <Input label="Notes (optional)" {...bind('notes')} />
    </RecordFormScreen>
  );
}

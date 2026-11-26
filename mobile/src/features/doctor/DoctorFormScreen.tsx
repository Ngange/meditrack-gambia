import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { KeyboardScreen } from '@/components/layout/KeyboardScreen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { doctorApi, type DoctorRecord } from '@/doctor/api';

import { kindOf } from './kinds';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID_KEY = { allergies: 'allergy_id', conditions: 'condition_id', visits: 'visit_id', medications: 'medication_id', lab_results: 'result_id' } as const;

export function DoctorFormScreen() {
  const { sid, kind: kindKey, item } = useLocalSearchParams<{ sid: string; kind: string; item?: string }>();
  const kind = kindOf(kindKey);
  const existing: DoctorRecord | null = item ? (JSON.parse(item) as DoctorRecord) : null;
  const id = existing ? String(existing[ID_KEY[kind.key]] ?? '') : '';

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(kind.fields.map((f) => [f.key, existing && typeof existing[f.from] === 'string' ? (existing[f.from] as string) : f.type === 'choice' && !existing ? f.options![0] : ''])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const found: Record<string, string> = {};
    for (const f of kind.fields) {
      const v = values[f.key].trim();
      if (f.required && !v) found[f.key] = 'This is required.';
      else if (f.type === 'date' && v && !DATE.test(v)) found[f.key] = 'Use the form YYYY-MM-DD, for example 2026-03-14.';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    const body: Record<string, unknown> = {};
    for (const f of kind.fields) body[f.key] = values[f.key].trim();
    // An edit sends back what the form does not show (the visit it belongs to, reminder times), or they would be cleared.
    if (existing && kind.keep) for (const [send, from] of Object.entries(kind.keep)) body[send] = existing[from] ?? undefined;

    setSaving(true);
    setFormError('');
    try {
      await doctorApi.save(sid, kind.key, body, existing ? id : undefined);
      router.back();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardScreen>
      <ScreenHeader title={`${existing ? 'Edit' : 'Add'} ${kind.noun}`} backLabel="Cancel" onBack={() => router.back()} />
      <ThemedView style={styles.fields}>
        {kind.fields.map((f) =>
          f.type === 'choice' ? (
            <ChipGroup
              key={f.key}
              label={f.label}
              options={f.options!}
              value={values[f.key] || null}
              clearable={!f.label.endsWith('Status')}
              onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v ?? '' }))}
            />
          ) : (
            <Input
              key={f.key}
              label={f.label}
              placeholder={f.placeholder ?? (f.type === 'date' ? 'YYYY-MM-DD' : undefined)}
              keyboardType={f.type === 'date' ? 'numbers-and-punctuation' : 'default'}
              error={errors[f.key]}
              value={values[f.key]}
              onChangeText={(t) => setValues((cur) => ({ ...cur, [f.key]: t }))}
            />
          ),
        )}
        <FormError message={formError} />
        <Button title={existing ? 'Save changes' : `Save ${kind.noun}`} onPress={save} loading={saving} />
      </ThemedView>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: Spacing.three },
});

import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { errorMessage, isAuthError } from '@/api';
import { KeyboardScreen } from '@/components/layout/KeyboardScreen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DangerLink } from '@/components/ui/danger-link';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { todayLocal } from '@/utils/dates';

import { labResultApi } from './api';
import { MAX_PANEL_ROWS, validatePanel, type PanelErrors, type PanelRowValues } from './panelValidation';

let nextId = 1;
const newRow = (): PanelRowValues => ({ id: nextId++, testName: '', result: '', referenceRange: '' });

/** Enter every result from one lab visit at once: one date and lab, then a row per test. */
export function LabPanelFormScreen() {
  const [testDate, setTestDate] = useState(todayLocal());
  const [facility, setFacility] = useState('');
  const [rows, setRows] = useState<PanelRowValues[]>(() => [newRow(), newRow(), newRow()]);
  const [errors, setErrors] = useState<PanelErrors>({ rows: {} });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const filledCount = rows.filter((r) => r.testName.trim()).length;

  const updateRow = (id: number, patch: Partial<PanelRowValues>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function handleSave() {
    setFormError('');
    const result = validatePanel({ testDate, facility, rows });
    setErrors(result.errors);
    if (!result.input) return;

    setSaving(true);
    try {
      await labResultApi.createMany(result.input);
      router.back();
    } catch (err) {
      if (!isAuthError(err)) setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardScreen>
      <ScreenHeader title="Add several results" backLabel="Cancel" onBack={() => router.back()} />
      <ThemedText themeColor="textSecondary">
        For results from the same visit to the lab. Leave spare rows empty.
      </ThemedText>

      <Input
        label="Date of tests"
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        value={testDate}
        onChangeText={setTestDate}
        error={errors.testDate}
      />
      <Input
        label="Lab or facility (optional)"
        placeholder="e.g. EFSTH Laboratory"
        value={facility}
        onChangeText={setFacility}
      />

      {rows.map((row, i) => (
        <Card key={row.id} style={styles.row}>
          <ThemedText type="smallBold">Test {i + 1}</ThemedText>
          <Input
            label={`Test ${i + 1} name`}
            placeholder="e.g. Hemoglobin"
            value={row.testName}
            onChangeText={(testName) => updateRow(row.id, { testName })}
            error={errors.rows[row.id]}
          />
          <Input
            label={`Test ${i + 1} result`}
            placeholder="e.g. 13.2 g/dL"
            value={row.result}
            onChangeText={(result) => updateRow(row.id, { result })}
          />
          <Input
            label={`Test ${i + 1} normal range`}
            placeholder="e.g. 12 - 16"
            value={row.referenceRange}
            onChangeText={(referenceRange) => updateRow(row.id, { referenceRange })}
          />
          {rows.length > 1 ? (
            <DangerLink
              label={`Remove test ${i + 1}`}
              busyLabel=""
              busy={false}
              onPress={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
            />
          ) : null}
        </Card>
      ))}

      <Button
        title="Add another test"
        variant="secondary"
        disabled={rows.length >= MAX_PANEL_ROWS}
        onPress={() => setRows((rs) => [...rs, newRow()])}
      />

      <ThemedView style={styles.footer}>
        <FormError message={formError || errors.form || ''} />
        <Button
          title={filledCount > 1 ? `Save ${filledCount} results` : 'Save result'}
          onPress={handleSave}
          loading={saving}
        />
      </ThemedView>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two },
  footer: { gap: Spacing.three },
});

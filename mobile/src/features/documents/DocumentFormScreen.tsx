import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { RecordFormScreen } from '@/components/records/RecordFormScreen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useFormState } from '@/hooks/useFormState';
import { useRecordForm } from '@/hooks/useRecordForm';
import { useRouteItem } from '@/hooks/useRouteItem';
import { todayLocal } from '@/utils/dates';

import { documentApi } from './api';
import { photographDocument, pickDocument } from './filePicker';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type MedicalDocument, type PickedFile } from './types';
import { validateDocument, type DocumentErrors } from './validation';

/** Adding: choose or photograph a file, then say what it is. Editing: change the details only. */
export function DocumentFormScreen() {
  const doc = useRouteItem<MedicalDocument>();
  const form = useRecordForm(documentApi, doc?.document_id);
  const { values, set, bind } = useFormState({
    documentType: doc?.document_type ?? 'other',
    description: doc?.description ?? '',
    documentDate: doc ? (doc.document_date ?? '') : todayLocal(),
    fileName: doc?.file_name ?? '',
  });
  const [file, setFile] = useState<PickedFile | null>(null);
  const [errors, setErrors] = useState<DocumentErrors>({});
  const [pickError, setPickError] = useState('');

  async function choose(pick: () => Promise<PickedFile | null>) {
    setPickError('');
    try {
      const picked = await pick();
      if (picked) {
        setFile(picked);
        setErrors({});
      }
    } catch (err) {
      setPickError(errorMessage(err));
    }
  }

  function handleSave() {
    const result = validateDocument({ ...values, file }, form.isEdit);
    setErrors(result.errors);
    if (result.input) void form.submit(result.input);
  }

  return (
    <RecordFormScreen
      noun="document"
      {...form}
      onSave={handleSave}
      onDelete={() => form.confirmRemove('Delete document', `Remove "${doc?.file_name}" and its file from your records?`)}>
      {form.isEdit ? (
        <Input label="File name" error={errors.fileName} {...bind('fileName')} />
      ) : (
        <ThemedView style={styles.group}>
          <ThemedText type="smallBold">File</ThemedText>
          {file ? (
            <ThemedText accessibilityLabel={`Chosen file: ${file.name}`}>{file.name}</ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              A PDF or a photo, up to 10 MB.
            </ThemedText>
          )}
          <Button title={file ? 'Choose a different file' : 'Choose a file'} variant="secondary" onPress={() => choose(pickDocument)} />
          <Button title="Take a photo" variant="secondary" onPress={() => choose(photographDocument)} />
          <FormError message={errors.file || pickError} />
        </ThemedView>
      )}

      <ChipGroup
        label="What is it?"
        options={DOCUMENT_TYPES}
        value={values.documentType}
        onChange={(v) => v && set('documentType', v)}
        format={(t) => DOCUMENT_TYPE_LABELS[t]}
      />
      <Input
        label="Date on the document (optional)"
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        error={errors.documentDate}
        {...bind('documentDate')}
      />
      <Input label="Note (optional)" placeholder="e.g. Malaria treatment, May 2026" {...bind('description')} />
    </RecordFormScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
});

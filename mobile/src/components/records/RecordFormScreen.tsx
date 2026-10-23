import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { KeyboardScreen } from '@/components/layout/KeyboardScreen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { DangerLink } from '@/components/ui/danger-link';
import { FormError } from '@/components/ui/form-error';
import { Spacing } from '@/constants/theme';

type Props = {
  /** "allergy", "visit", ... used for "Add allergy", "Save allergy", "Delete this allergy". */
  noun: string;
  isEdit: boolean;
  saving: boolean;
  deleting: boolean;
  formError: string;
  onSave: () => void;
  onDelete: () => void;
  children: ReactNode;
};

/** The add/edit layout shared by every record form: header, fields, error, save, and delete when editing. */
export function RecordFormScreen({ noun, isEdit, saving, deleting, formError, onSave, onDelete, children }: Props) {
  return (
    <KeyboardScreen centered>
      <ScreenHeader title={`${isEdit ? 'Edit' : 'Add'} ${noun}`} backLabel="Cancel" onBack={() => router.back()} />

      <ThemedView style={styles.fields}>
        {children}
        <FormError message={formError} />
        <Button title={isEdit ? 'Save changes' : `Save ${noun}`} onPress={onSave} loading={saving} />
      </ThemedView>

      {isEdit ? (
        <DangerLink
          label={`Delete this ${noun}`}
          busyLabel="Deleting…"
          busy={deleting}
          disabled={saving}
          onPress={onDelete}
        />
      ) : null}
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: Spacing.three },
});

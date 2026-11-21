import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipGroup } from '@/components/ui/chip-group';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { photographDocument, pickDocument } from '@/features/documents/filePicker';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type PickedFile } from '@/features/documents/types';

import { newId, type Extras } from './extras';

type Props = { extras: Extras; onChange: (extras: Extras) => void };

/** The "what came out of this visit?" part of the add-visit form. */
export function VisitExtrasFields({ extras, onChange }: Props) {
  const [pickError, setPickError] = useState('');
  const patch = (p: Partial<Extras>) => onChange({ ...extras, ...p });

  async function addFile(pick: () => Promise<PickedFile | null>) {
    setPickError('');
    try {
      const file = await pick();
      if (file) patch({ documents: [...extras.documents, { id: newId(), file, type: 'other' }] });
    } catch (err) {
      setPickError(errorMessage(err));
    }
  }

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold">What came out of this visit? (optional)</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Add the diagnosis, medicines, tests and papers from this visit. They are saved together and linked to it.
      </ThemedText>

      <ThemedText type="smallBold">Diagnoses</ThemedText>
      {extras.diagnoses.map((d, i) => (
        <Card key={d.id} style={styles.row}>
          <Input
            label={`Diagnosis ${i + 1}`}
            placeholder="e.g. Malaria"
            value={d.name}
            onChangeText={(name) => patch({ diagnoses: extras.diagnoses.map((x) => (x.id === d.id ? { ...x, name } : x)) })}
          />
          <Button
            title="Remove"
            variant="secondary"
            accessibilityLabel={`Remove diagnosis ${i + 1}`}
            onPress={() => patch({ diagnoses: extras.diagnoses.filter((x) => x.id !== d.id) })}
          />
        </Card>
      ))}
      <Button
        title="Add a diagnosis"
        variant="secondary"
        onPress={() => patch({ diagnoses: [...extras.diagnoses, { id: newId(), name: '' }] })}
      />

      <ThemedText type="smallBold">Prescriptions</ThemedText>
      {extras.prescriptions.map((p, i) => {
        const set = (change: Partial<typeof p>) =>
          patch({ prescriptions: extras.prescriptions.map((x) => (x.id === p.id ? { ...x, ...change } : x)) });
        return (
          <Card key={p.id} style={styles.row}>
            <Input label={`Medicine ${i + 1}`} placeholder="e.g. Coartem" value={p.name} onChangeText={(name) => set({ name })} />
            <Input label={`Dosage ${i + 1} (optional)`} placeholder="e.g. 4 tablets" value={p.dosage} onChangeText={(dosage) => set({ dosage })} />
            <Input label={`How often ${i + 1} (optional)`} placeholder="e.g. Twice daily" value={p.frequency} onChangeText={(frequency) => set({ frequency })} />
            <Button
              title="Remove"
              variant="secondary"
              accessibilityLabel={`Remove prescription ${i + 1}`}
              onPress={() => patch({ prescriptions: extras.prescriptions.filter((x) => x.id !== p.id) })}
            />
          </Card>
        );
      })}
      <Button
        title="Add a prescription"
        variant="secondary"
        onPress={() => patch({ prescriptions: [...extras.prescriptions, { id: newId(), name: '', dosage: '', frequency: '' }] })}
      />

      <ThemedText type="smallBold">Tests</ThemedText>
      {extras.tests.map((t, i) => {
        const set = (change: Partial<typeof t>) =>
          patch({ tests: extras.tests.map((x) => (x.id === t.id ? { ...x, ...change } : x)) });
        return (
          <Card key={t.id} style={styles.row}>
            <Input label={`Test ${i + 1}`} placeholder="e.g. Malaria film" value={t.name} onChangeText={(name) => set({ name })} />
            <Input label={`Result ${i + 1} (optional)`} placeholder="e.g. Positive" value={t.result} onChangeText={(result) => set({ result })} />
            <Input label={`Normal range ${i + 1} (optional)`} placeholder="e.g. 12 - 16 g/dL" value={t.range} onChangeText={(range) => set({ range })} />
            <Button
              title="Remove"
              variant="secondary"
              accessibilityLabel={`Remove test ${i + 1}`}
              onPress={() => patch({ tests: extras.tests.filter((x) => x.id !== t.id) })}
            />
          </Card>
        );
      })}
      <Button
        title="Add a test"
        variant="secondary"
        onPress={() => patch({ tests: [...extras.tests, { id: newId(), name: '', result: '', range: '' }] })}
      />

      <ThemedText type="smallBold">Documents</ThemedText>
      {extras.documents.map((d) => (
        <Card key={d.id} style={styles.row}>
          <ThemedText accessibilityLabel={`Attached: ${d.file.name}`}>{d.file.name}</ThemedText>
          <ChipGroup
            label={`What is ${d.file.name}?`}
            options={DOCUMENT_TYPES}
            value={d.type}
            onChange={(type) => type && patch({ documents: extras.documents.map((x) => (x.id === d.id ? { ...x, type } : x)) })}
            format={(t) => DOCUMENT_TYPE_LABELS[t]}
          />
          <Button
            title="Remove"
            variant="secondary"
            accessibilityLabel={`Remove ${d.file.name}`}
            onPress={() => patch({ documents: extras.documents.filter((x) => x.id !== d.id) })}
          />
        </Card>
      ))}
      <Button title="Attach a file" variant="secondary" onPress={() => addFile(pickDocument)} />
      <Button title="Take a photo of a paper" variant="secondary" onPress={() => addFile(photographDocument)} />
      <FormError message={pickError} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { gap: Spacing.two },
});

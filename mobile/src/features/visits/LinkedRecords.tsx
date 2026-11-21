import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { DOCUMENT_TYPE_LABELS } from '@/features/documents/types';

import { visitApi } from './api';
import type { LinkedRecords as Linked } from './types';

/** On an existing visit: what came out of it. Link more from each record's own edit screen. */
export function LinkedRecords({ visitId }: { visitId: string }) {
  const [linked, setLinked] = useState<Linked | null>(null);

  useEffect(() => {
    let alive = true;
    visitApi
      .linked(visitId)
      .then((l) => alive && setLinked(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [visitId]);

  if (!linked) return null;
  const lines: [string, string[]][] = [
    ['Diagnoses', linked.conditions.map((c) => c.condition_name)],
    ['Prescriptions', linked.medications.map((m) => [m.medication_name, m.dosage].filter(Boolean).join(' '))],
    ['Tests', linked.lab_results.map((r) => [r.test_name, r.result].filter(Boolean).join(': '))],
    ['Documents', linked.documents.map((d) => `${d.file_name} (${DOCUMENT_TYPE_LABELS[d.document_type]})`)],
  ];
  const shown = lines.filter(([, items]) => items.length > 0);

  return (
    <ThemedView style={styles.group}>
      <ThemedText type="smallBold">What came out of this visit</ThemedText>
      {shown.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Nothing is linked to this visit yet. Choose this visit when you add or edit a diagnosis, medicine, test or document.
        </ThemedText>
      ) : (
        shown.map(([title, items]) => (
          <ThemedText key={title} type="small" themeColor="textSecondary">
            {title}: {items.join('; ')}
          </ThemedText>
        ))
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.one },
});

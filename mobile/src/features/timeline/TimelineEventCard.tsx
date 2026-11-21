import { ThemedText } from '@/components/themed-text';
import { PressableCard } from '@/components/ui/pressable-card';
import { DOCUMENT_TYPE_LABELS } from '@/features/documents/types';
import { openRecordForm } from '@/utils/navigation';
import { router } from 'expo-router';

import type { TimelineEvent } from './types';

const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ');

function Line({ children }: { children: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

/** One timeline entry. Tapping opens the record (a lab panel opens the lab results list). */
export function TimelineEventCard({ event }: { event: TimelineEvent }) {
  switch (event.kind) {
    case 'visit': {
      const v = event.visit;
      return (
        <PressableCard
          label={`Visit on ${event.date}${v.facility_name ? ` at ${v.facility_name}` : ''}`}
          onPress={() => openRecordForm('/visit-form', v)}>
          <ThemedText type="small" themeColor="textSecondary">
            Visit · {event.date}
          </ThemedText>
          <ThemedText type="smallBold">{v.facility_name || v.reason || 'Visit'}</ThemedText>
          {v.facility_name && v.reason ? <Line>{`Reason: ${v.reason}`}</Line> : null}
          {event.conditions.length > 0 ? <Line>{`Diagnosed: ${event.conditions.map((c) => c.condition_name).join('; ')}`}</Line> : null}
          {event.medications.length > 0 ? <Line>{`Prescribed: ${event.medications.map((m) => join(m.medication_name, m.dosage)).join('; ')}`}</Line> : null}
          {event.lab_results.length > 0 ? <Line>{`Tests: ${event.lab_results.map((r) => (r.result ? `${r.test_name}: ${r.result}` : r.test_name)).join('; ')}`}</Line> : null}
          {event.documents.length > 0 ? <Line>{`Documents: ${event.documents.map((d) => d.file_name).join('; ')}`}</Line> : null}
        </PressableCard>
      );
    }
    case 'condition':
      return (
        <PressableCard label={`Diagnosis: ${event.condition.condition_name}`} onPress={() => openRecordForm('/condition-form', event.condition)}>
          <ThemedText type="small" themeColor="textSecondary">
            Diagnosis · {event.date}
          </ThemedText>
          <ThemedText type="smallBold">{event.condition.condition_name}</ThemedText>
          <Line>{`Status: ${event.condition.status}`}</Line>
        </PressableCard>
      );
    case 'medication':
      return (
        <PressableCard label={`Medication: ${event.medication.medication_name}`} onPress={() => openRecordForm('/medication-form', event.medication)}>
          <ThemedText type="small" themeColor="textSecondary">
            Medication started · {event.date}
          </ThemedText>
          <ThemedText type="smallBold">{join(event.medication.medication_name, event.medication.dosage)}</ThemedText>
          <Line>{join(event.medication.frequency, `(${event.medication.status})`)}</Line>
        </PressableCard>
      );
    case 'lab_panel':
      return (
        <PressableCard label={`Lab results on ${event.date}`} onPress={() => router.push('/lab-results')}>
          <ThemedText type="small" themeColor="textSecondary">
            Lab results · {event.date}
          </ThemedText>
          {event.facility_name ? <ThemedText type="smallBold">{event.facility_name}</ThemedText> : null}
          {event.lab_results.map((r) => (
            <Line key={r.result_id}>{r.result ? `${r.test_name}: ${r.result}` : r.test_name}</Line>
          ))}
        </PressableCard>
      );
    case 'document':
      return (
        <PressableCard label={`Document: ${event.document.file_name}`} onPress={() => openRecordForm('/document-form', event.document)}>
          <ThemedText type="small" themeColor="textSecondary">
            Document · {event.date}
          </ThemedText>
          <ThemedText type="smallBold">{event.document.file_name}</ThemedText>
          <Line>{DOCUMENT_TYPE_LABELS[event.document.document_type]}</Line>
        </PressableCard>
      );
  }
}

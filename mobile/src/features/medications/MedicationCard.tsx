import { ThemedText } from '@/components/themed-text';
import { capitalize } from '@/utils/text';

import type { Medication } from './types';

export function MedicationCard({ item }: { item: Medication }) {
  return (
    <>
      <ThemedText type="smallBold">{item.medication_name}</ThemedText>
      {item.dosage || item.frequency ? (
        <ThemedText type="small" themeColor="textSecondary">
          {[item.dosage, item.frequency].filter(Boolean).join(' · ')}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        {capitalize(item.status)} · Started {item.start_date}
        {item.end_date ? ` · Ended ${item.end_date}` : ''}
      </ThemedText>
      {item.reminder_times.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Reminders: {item.reminder_times.join(', ')}
        </ThemedText>
      ) : null}
    </>
  );
}

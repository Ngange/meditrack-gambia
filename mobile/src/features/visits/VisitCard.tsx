import { ThemedText } from '@/components/themed-text';

import type { Visit } from './types';

export function VisitCard({ item }: { item: Visit }) {
  return (
    <>
      <ThemedText type="smallBold">{item.facility_name || 'Visit'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {item.visit_date}
      </ThemedText>
      {item.reason ? (
        <ThemedText type="small" themeColor="textSecondary">
          Reason: {item.reason}
        </ThemedText>
      ) : null}
      {item.diagnosis ? (
        <ThemedText type="small" themeColor="textSecondary">
          Diagnosis: {item.diagnosis}
        </ThemedText>
      ) : null}
    </>
  );
}

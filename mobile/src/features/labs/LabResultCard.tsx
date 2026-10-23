import { ThemedText } from '@/components/themed-text';

import type { LabResult } from './types';

export function LabResultCard({ item }: { item: LabResult }) {
  return (
    <>
      <ThemedText type="smallBold">{item.test_name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {item.test_date}
        {item.facility_name ? ` · ${item.facility_name}` : ''}
      </ThemedText>
      {item.result ? <ThemedText type="small">Result: {item.result}</ThemedText> : null}
      {item.reference_range ? (
        <ThemedText type="small" themeColor="textSecondary">
          Normal range: {item.reference_range}
        </ThemedText>
      ) : null}
    </>
  );
}

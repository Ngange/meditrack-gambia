import { ThemedText } from '@/components/themed-text';
import { capitalize } from '@/utils/text';

import type { Condition } from './types';

export function ConditionCard({ item }: { item: Condition }) {
  return (
    <>
      <ThemedText type="smallBold">{item.condition_name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {capitalize(item.status)}
        {item.diagnosis_date ? ` · Diagnosed ${item.diagnosis_date}` : ''}
      </ThemedText>
      {item.notes ? (
        <ThemedText type="small" themeColor="textSecondary">
          {item.notes}
        </ThemedText>
      ) : null}
    </>
  );
}

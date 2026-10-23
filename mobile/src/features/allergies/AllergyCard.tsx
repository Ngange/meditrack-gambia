import { ThemedText } from '@/components/themed-text';
import { capitalize } from '@/utils/text';

import type { Allergy } from './types';

export function AllergyCard({ item }: { item: Allergy }) {
  const urgent = item.severity === 'severe' && item.status === 'active';
  return (
    <>
      <ThemedText type="smallBold">{item.allergen}</ThemedText>
      {item.reaction ? (
        <ThemedText type="small" themeColor="textSecondary">
          {item.reaction}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor={urgent ? 'error' : 'textSecondary'}>
        {item.severity ? `${capitalize(item.severity)} · ` : ''}
        {capitalize(item.status)}
      </ThemedText>
    </>
  );
}

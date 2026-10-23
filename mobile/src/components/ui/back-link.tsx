import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function BackLink({ label = 'Back', onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label === 'Back' ? 'Go back' : label}>
      <ThemedText type="linkPrimary">‹ {label}</ThemedText>
    </Pressable>
  );
}

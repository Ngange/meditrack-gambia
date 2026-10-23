import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from './card';

type Props = {
  onPress: () => void;
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** A tappable Card. `label` is what screen readers announce. */
export function PressableCard({ onPress, label, children, style }: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={style}>
      <Card>{children}</Card>
    </Pressable>
  );
}

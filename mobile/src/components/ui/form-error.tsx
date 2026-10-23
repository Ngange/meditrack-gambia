import { ThemedText } from '@/components/themed-text';

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <ThemedText themeColor="error" type="small">
      ⚠ {message}
    </ThemedText>
  );
}

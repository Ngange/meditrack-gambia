export function validateCondition(values: { name: string }): string | null {
  if (!values.name.trim()) return 'Condition name is required.';
  return null;
}

// Returns the message to show, or null when the values are fine. The server checks again.
export function validateAllergy(values: { allergen: string }): string | null {
  if (!values.allergen.trim()) return 'Allergen is required.';
  return null;
}

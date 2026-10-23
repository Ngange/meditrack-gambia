// What RecordPage gives each feature's form component.
export type RecordFormProps<T, I> = {
  /** The record being edited, or null when adding a new one. */
  initial: T | null;
  saving: boolean;
  /** An error from the server for the last save. */
  error: string;
  onSubmit: (input: I) => void;
  onCancel: () => void;
};

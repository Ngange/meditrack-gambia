import type { FormEvent, ReactNode } from 'react';

type RecordFormProps = {
  /** "allergy", "visit", ... used in the heading and the Save button. */
  noun: string;
  isNew: boolean;
  saving: boolean;
  error: string;
  onSubmit: () => void;
  onCancel: () => void;
  children: ReactNode;
};

// The card around an add / edit form: heading, the fields, the error line and Save / Cancel.
export function RecordForm({ noun, isNew, saving, error, onSubmit, onCancel, children }: RecordFormProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form className="a-card a-form" onSubmit={handleSubmit} noValidate>
      <h2>{isNew ? `Add ${noun}` : `Edit ${noun}`}</h2>

      {children}

      {error && (
        <p className="a-error" role="alert">
          ⚠ {error}
        </p>
      )}

      <div className="a-actions">
        <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isNew ? `Save ${noun}` : 'Save changes'}
        </button>
        <button type="button" className="a-btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

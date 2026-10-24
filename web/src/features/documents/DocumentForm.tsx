import { useState } from 'react';
import { TextField } from '../../components/forms/TextField';
import { RecordForm } from '../../components/records/RecordForm';
import type { RecordFormProps } from '../../components/records/types';
import { useFormState } from '../../hooks/useFormState';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type DocumentInput, type DocumentType, type MedicalDocument } from '../../types/records';
import { today } from '../../utils/dates';
import { validateDocumentDate, validateFile, validateFileName } from './validation';

// Adding: choose a file and say what it is. Editing: change the details only, never the file.
export function DocumentForm({ initial, saving, error, onSubmit, onCancel }: RecordFormProps<MedicalDocument, DocumentInput>) {
  const { values, bind } = useFormState({
    documentType: initial?.document_type ?? 'other',
    description: initial?.description ?? '',
    documentDate: initial ? (initial.document_date ?? '') : today(),
    fileName: initial?.file_name ?? '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState('');

  function submit() {
    const problem = (initial ? validateFileName(values.fileName) : validateFile(file)) ?? validateDocumentDate(values.documentDate);
    setLocalError(problem ?? '');
    if (problem) return;
    onSubmit({
      documentType: values.documentType as DocumentType,
      description: values.description.trim(),
      documentDate: values.documentDate,
      ...(initial ? { fileName: values.fileName.trim() } : { file: file! }),
    });
  }

  return (
    <RecordForm noun="document" isNew={!initial} saving={saving} error={localError || error} onSubmit={submit} onCancel={onCancel}>
      {initial ? (
        <TextField label="File name" maxLength={255} autoFocus {...bind('fileName')} />
      ) : (
        <label className="a-field">
          <span>File (PDF or photo, up to 10 MB)</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      )}
      <label className="a-field">
        <span>What is it?</span>
        <select {...bind('documentType')}>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {DOCUMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <TextField label="Date on the document (optional)" type="date" max={today()} {...bind('documentDate')} />
      <TextField label="Note (optional)" placeholder="e.g. Malaria treatment, May 2026" maxLength={1000} {...bind('description')} />
    </RecordForm>
  );
}

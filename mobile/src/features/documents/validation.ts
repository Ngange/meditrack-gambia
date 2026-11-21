import { DATE_HINT, isRealDate, todayLocal } from '@/utils/dates';
import type { Validation } from '@/utils/validation';

import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES, type DocumentInput, type DocumentType, type PickedFile } from './types';

export type DocumentValues = {
  documentType: DocumentType;
  description: string;
  documentDate: string;
  fileName: string;
  file: PickedFile | null;
};
export type DocumentErrors = { file?: string; fileName?: string; documentDate?: string };

const extensionOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

/** A message if this file cannot be uploaded (wrong kind or too big), otherwise undefined. */
export function fileProblem(file: PickedFile): string | undefined {
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
    return 'Only PDF and image files (JPG, PNG, WebP, HEIC) can be uploaded.';
  }
  if (file.size !== undefined && file.size > MAX_FILE_BYTES) return 'That file is too large. The limit is 10 MB.';
  return undefined;
}

export function validateDocument(v: DocumentValues, isEdit: boolean): Validation<DocumentInput, DocumentErrors> {
  const errors: DocumentErrors = {};

  if (isEdit) {
    if (!v.fileName.trim()) errors.fileName = 'The file name cannot be empty.';
  } else if (!v.file) {
    errors.file = 'Choose a file or take a photo.';
  } else {
    errors.file = fileProblem(v.file);
  }

  const date = v.documentDate.trim();
  if (date && !isRealDate(date)) errors.documentDate = `${DATE_HINT}, e.g. 2026-03-02.`;
  else if (date > todayLocal()) errors.documentDate = 'The date cannot be in the future.';

  if (errors.file || errors.fileName || errors.documentDate) return { input: null, errors };
  return {
    input: {
      documentType: v.documentType,
      description: v.description.trim(),
      documentDate: date,
      ...(isEdit ? { fileName: v.fileName.trim() } : { file: v.file! }),
    },
    errors,
  };
}

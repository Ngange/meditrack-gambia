import { today } from '../../utils/dates';
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from '../../types/records';

const extensionOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

/** Returns a message if the chosen file cannot be uploaded, otherwise null. */
export function validateFile(file: File | null): string | null {
  if (!file) return 'Choose a file to upload.';
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
    return 'Only PDF and image files (JPG, PNG, WebP, HEIC) can be uploaded.';
  }
  if (file.size > MAX_FILE_BYTES) return 'That file is too large. The limit is 10 MB.';
  return null;
}

export function validateDocumentDate(date: string): string | null {
  return date > today() ? 'The date cannot be in the future.' : null;
}

export function validateFileName(name: string): string | null {
  return name.trim() ? null : 'The file name cannot be empty.';
}

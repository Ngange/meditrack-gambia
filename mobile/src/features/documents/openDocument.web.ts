import { downloadFile } from '@/api/files';

import { documentFilePath } from './api';
import type { MedicalDocument } from './types';

/** Web build: downloads the document through a temporary link. */
export async function openDocument(doc: MedicalDocument) {
  const url = await downloadFile(documentFilePath(doc.document_id), doc.file_name);
  const link = document.createElement('a');
  link.href = url;
  link.download = doc.file_name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

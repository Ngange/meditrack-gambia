import * as Sharing from 'expo-sharing';

import { downloadFile } from '@/api/files';

import { documentFilePath } from './api';
import type { MedicalDocument } from './types';

/** Downloads the document and hands it to the phone's own viewer / share sheet. */
export async function openDocument(doc: MedicalDocument) {
  const uri = await downloadFile(documentFilePath(doc.document_id), doc.file_name);
  if (!(await Sharing.isAvailableAsync())) throw new Error('This phone cannot open files from the app.');
  await Sharing.shareAsync(uri, { dialogTitle: doc.file_name });
}

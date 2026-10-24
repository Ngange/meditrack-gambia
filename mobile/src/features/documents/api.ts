import { createRecordApi, request } from '@/api';

import type { DocumentInput, MedicalDocument } from './types';

const base = createRecordApi<MedicalDocument, DocumentInput>('documents', 'document');

function toForm({ file, documentType, description, documentDate, fileName }: DocumentInput) {
  const form = new FormData();
  if (file?.file) {
    // Web: a real File object.
    form.append('file', file.file, file.name);
  } else if (file) {
    // React Native: this object shape is how a file on the phone is attached to a FormData.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
  }
  form.append('documentType', documentType);
  if (description) form.append('description', description);
  if (documentDate) form.append('documentDate', documentDate);
  if (fileName) form.append('fileName', fileName);
  return form;
}

export const documentApi = {
  list: base.list,
  remove: base.remove,

  /** Uploads the chosen file with its details. A big photo on a weak connection can take a while. */
  async create(input: DocumentInput) {
    const res = await request<{ document: MedicalDocument }>('/records/documents', {
      method: 'POST',
      body: toForm(input),
      timeoutMs: 90_000,
    });
    return res.document;
  },

  /** Edits the details only (type, description, shown name). The file itself never changes. */
  async update(id: string, { documentType, description, documentDate, fileName }: DocumentInput) {
    const res = await request<{ document: MedicalDocument }>(`/records/documents/${id}`, {
      method: 'PUT',
      body: { documentType, description, documentDate, fileName },
    });
    return res.document;
  },
};

export const documentFilePath = (id: string) => `/records/documents/${id}/file`;

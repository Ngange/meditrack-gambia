import { request } from '@/api';
import { activeStore } from '@/offline/active';

import type { DocumentInput, MedicalDocument } from './types';


function toForm({ file, documentType, description, documentDate, visitId, fileName }: DocumentInput) {
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
  if (visitId) form.append('visitId', visitId);
  if (fileName) form.append('fileName', fileName);
  return form;
}

// Documents are read from the phone's saved copy (their details download with every sync), but adding,
// editing or removing one happens on the server, because the file itself lives there. Each of these needs a
// connection; the phone's copy is updated from the server's answer.
export const documentApi = {
  list: () => activeStore().list<MedicalDocument>('documents'),

  async remove(id: string) {
    await request<{ deleted: boolean }>(`/records/documents/${id}`, { method: 'DELETE' });
    await activeStore().dropLocal('documents', id);
  },

  /** Uploads the chosen file with its details. A big photo on a weak connection can take a while. */
  async create(input: DocumentInput) {
    const res = await request<{ document: MedicalDocument }>('/records/documents', {
      method: 'POST',
      body: toForm(input),
      timeoutMs: 90_000,
    });
    await activeStore().putServerRecord('documents', res.document as unknown as Record<string, unknown>);
    return res.document;
  },

  /** Edits the details only (type, description, shown name). The file itself never changes. */
  async update(id: string, { documentType, description, documentDate, visitId, fileName }: DocumentInput) {
    const res = await request<{ document: MedicalDocument }>(`/records/documents/${id}`, {
      method: 'PUT',
      body: { documentType, description, documentDate, visitId, fileName },
    });
    await activeStore().putServerRecord('documents', res.document as unknown as Record<string, unknown>);
    return res.document;
  },
};

export const documentFilePath = (id: string) => `/records/documents/${id}/file`;

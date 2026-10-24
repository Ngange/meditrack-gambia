import type { DocumentInput, MedicalDocument } from '../types/records';
import { ApiError, notifyUnauthorized, request } from './client';
import { createRecordApi } from './records';
import { getToken } from '../utils/token-storage';

const API_URL = import.meta.env.VITE_API_URL;
const base = createRecordApi<MedicalDocument, DocumentInput>('documents', 'document');

function toForm({ file, documentType, description, documentDate, fileName }: DocumentInput) {
  const form = new FormData();
  if (file) form.append('file', file, file.name);
  form.append('documentType', documentType);
  if (description) form.append('description', description);
  if (documentDate) form.append('documentDate', documentDate);
  if (fileName) form.append('fileName', fileName);
  return form;
}

export const documentsApi = {
  list: base.list,
  remove: base.remove,

  async create(input: DocumentInput) {
    const data = await request<{ document: MedicalDocument }>('/records/documents', { method: 'POST', body: toForm(input) });
    return data.document;
  },

  /** Edits the details only. The file itself never changes. */
  async update(id: string, { documentType, description, documentDate, fileName }: DocumentInput) {
    const data = await request<{ document: MedicalDocument }>(`/records/documents/${id}`, {
      method: 'PUT',
      body: { documentType, description, documentDate, fileName },
    });
    return data.document;
  },

  /** Fetches the file with the token (a plain link would not carry it) and saves it from the browser. */
  async download(doc: MedicalDocument) {
    const token = getToken();
    if (!token) {
      notifyUnauthorized();
      throw new ApiError('You are signed out. Please log in again.', 401);
    }
    let res: Response;
    try {
      res = await fetch(`${API_URL}/records/documents/${doc.document_id}/file`, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
    }
    if (res.status === 401 || res.status === 403) {
      notifyUnauthorized();
      throw new ApiError('You are signed out. Please log in again.', 401);
    }
    if (!res.ok) throw new ApiError(res.status === 404 ? 'That document could not be found.' : 'Could not download the document.', res.status);

    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.file_name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};

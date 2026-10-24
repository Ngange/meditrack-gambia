export const DOCUMENT_TYPES = [
  'prescription',
  'lab_report',
  'discharge_summary',
  'medical_certificate',
  'other',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  prescription: 'Prescription',
  lab_report: 'Lab report',
  discharge_summary: 'Discharge summary',
  medical_certificate: 'Medical certificate',
  other: 'Other',
};

export type MedicalDocument = {
  document_id: string;
  document_type: DocumentType;
  file_name: string;
  description: string | null;
  /** The date on the document itself (YYYY-MM-DD); null for older uploads. */
  document_date: string | null;
  upload_date: string;
};

/** A file chosen on the phone (or in the browser), not uploaded yet. */
export type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  /** Web only: the browser's File object. */
  file?: File;
};

export type DocumentInput = {
  documentType: DocumentType;
  description?: string;
  documentDate?: string;
  /** Editing: the shown file name. */
  fileName?: string;
  /** Adding: the file to upload. */
  file?: PickedFile;
};

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'] as const;

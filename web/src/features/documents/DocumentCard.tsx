import { useState } from 'react';
import { documentsApi } from '../../api/documents';
import { errorMessage, isAuthError } from '../../api/client';
import { Pill } from '../../components/ui/Pill';
import { DOCUMENT_TYPE_LABELS, type MedicalDocument } from '../../types/records';

export function DocumentCard({ doc }: { doc: MedicalDocument }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function open() {
    setBusy(true);
    setError('');
    try {
      await documentsApi.download(doc);
    } catch (err) {
      if (!isAuthError(err)) setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="a-item-top">
        <strong>{doc.file_name}</strong>
        <Pill>{DOCUMENT_TYPE_LABELS[doc.document_type]}</Pill>
      </div>
      {doc.description && <div className="a-note">{doc.description}</div>}
      <div className="a-meta">
        {doc.document_date ? `Dated ${doc.document_date} · ` : ''}Added {doc.upload_date.slice(0, 10)}
      </div>
      {error && (
        <p className="a-error" role="alert">
          ⚠ {error}
        </p>
      )}
      <div className="a-actions">
        <button type="button" className="a-btn a-btn-sm" onClick={open} disabled={busy} aria-label={`Open ${doc.file_name}`}>
          {busy ? 'Opening…' : 'Open'}
        </button>
      </div>
    </>
  );
}

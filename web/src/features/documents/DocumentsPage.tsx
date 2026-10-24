import { documentsApi } from '../../api/documents';
import { RecordPage } from '../../components/records/RecordPage';
import { useRecordCrud } from '../../hooks/useRecordCrud';
import type { DocumentInput, MedicalDocument } from '../../types/records';
import { DocumentCard } from './DocumentCard';
import { DocumentForm } from './DocumentForm';

export function DocumentsPage() {
  const crud = useRecordCrud<MedicalDocument, DocumentInput>(documentsApi, (d) => d.document_id);

  return (
    <RecordPage
      title="Documents"
      subtitle="Prescriptions, reports and certificates, stored encrypted"
      addLabel="+ Add document"
      emptyMessage="No documents yet. Add a photo or PDF of a prescription, report or certificate so it is always with you."
      crud={crud}
      Form={DocumentForm}
      renderItem={(d) => <DocumentCard doc={d} />}
      confirmDelete={(d) => `Remove "${d.file_name}" and its file from your records?`}
    />
  );
}

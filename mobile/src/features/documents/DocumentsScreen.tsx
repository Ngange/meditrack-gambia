import { RecordListScreen } from '@/components/records/RecordListScreen';

import { documentApi } from './api';
import { DocumentCard } from './DocumentCard';

export function DocumentsScreen() {
  return (
    <RecordListScreen
      title="Documents"
      api={documentApi}
      formPath="/document-form"
      addLabel="Add document"
      emptyMessage="No documents yet. Add a photo or PDF of a prescription, report or certificate so it is always with you."
      getId={(d) => d.document_id}
      getLabel={(d) => `Edit document details: ${d.file_name}`}
      renderItem={(d) => <DocumentCard item={d} />}
    />
  );
}

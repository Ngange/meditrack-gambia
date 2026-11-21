import { documentsApi } from '../../api/documents';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { useFetch } from '../../hooks/useFetch';
import { DocumentCard } from '../documents/DocumentCard';

// Documents are read only for doctors: they can open them but not add or change them.
export function DoctorDocuments() {
  const { data, loading, error, reload } = useFetch(documentsApi.list);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorCard message={error || 'Could not load documents.'} onRetry={reload} />;
  return (
    <div className="allergies-page">
      <div className="allergies-inner">
        <div className="allergies-head">
          <h1>Documents</h1>
        </div>
        {data.length === 0 ? (
          <p className="a-muted">Nothing recorded yet.</p>
        ) : (
          <ul className="a-list">
            {data.map((d) => (
              <li key={d.document_id} className="a-card a-item">
                <DocumentCard doc={d} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

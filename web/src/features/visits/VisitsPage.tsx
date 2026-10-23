import { visitsApi } from '../../api/visits';
import { RecordPage } from '../../components/records/RecordPage';
import { useRecordCrud } from '../../hooks/useRecordCrud';
import type { Visit, VisitInput } from '../../types/records';
import { VisitCard } from './VisitCard';
import { VisitForm } from './VisitForm';

export function VisitsPage() {
  const crud = useRecordCrud<Visit, VisitInput>(visitsApi, (v) => v.visit_id);

  return (
    <RecordPage
      title="Visits"
      subtitle="Clinic and hospital visits, with what was found and what was done"
      addLabel="+ Add visit"
      emptyMessage="No visits recorded yet. Add a clinic or hospital visit to start your history."
      crud={crud}
      Form={VisitForm}
      renderItem={(v) => <VisitCard visit={v} />}
      confirmDelete={(v) => `Remove ${v.facility_name || 'this visit'} on ${v.visit_date} from your records?`}
    />
  );
}

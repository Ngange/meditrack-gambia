import { RecordListScreen } from '@/components/records/RecordListScreen';

import { visitApi } from './api';
import { VisitCard } from './VisitCard';

export function VisitsScreen() {
  return (
    <RecordListScreen
      title="Visits"
      api={visitApi}
      formPath="/visit-form"
      addLabel="Add visit"
      emptyMessage="No visits recorded yet. Add a clinic or hospital visit to start your history."
      getId={(v) => v.visit_id}
      getLabel={(v) => `Edit visit on ${v.visit_date}${v.facility_name ? ` at ${v.facility_name}` : ''}`}
      renderItem={(v) => <VisitCard item={v} />}
    />
  );
}

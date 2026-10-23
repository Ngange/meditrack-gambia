import { RecordListScreen } from '@/components/records/RecordListScreen';

import { medicationApi } from './api';
import { MedicationCard } from './MedicationCard';

export function MedicationsScreen() {
  return (
    <RecordListScreen
      title="Medications"
      api={medicationApi}
      formPath="/medication-form"
      addLabel="Add medication"
      emptyMessage="No medications recorded yet. Add what you take so a doctor can see it at a glance."
      getId={(m) => m.medication_id}
      getLabel={(m) => `Edit medication: ${m.medication_name}`}
      renderItem={(m) => <MedicationCard item={m} />}
    />
  );
}

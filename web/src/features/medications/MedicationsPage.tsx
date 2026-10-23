import { medicationsApi } from '../../api/medications';
import { RecordPage } from '../../components/records/RecordPage';
import { useRecordCrud } from '../../hooks/useRecordCrud';
import type { Medication, MedicationInput } from '../../types/records';
import { MedicationCard } from './MedicationCard';
import { MedicationForm } from './MedicationForm';

export function MedicationsPage() {
  const crud = useRecordCrud<Medication, MedicationInput>(medicationsApi, (m) => m.medication_id);

  return (
    <RecordPage
      title="Medications"
      subtitle="What you take, how much, how often and for how long"
      addLabel="+ Add medication"
      emptyMessage="No medications recorded yet. Add what you take so a doctor can see it at a glance."
      crud={crud}
      Form={MedicationForm}
      renderItem={(m) => <MedicationCard medication={m} />}
      confirmDelete={(m) => `Remove "${m.medication_name}" from your records?`}
    />
  );
}

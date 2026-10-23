import { allergiesApi } from '../../api/allergies';
import { RecordPage } from '../../components/records/RecordPage';
import { useRecordCrud } from '../../hooks/useRecordCrud';
import type { Allergy, AllergyInput } from '../../types/records';
import { AllergyCard } from './AllergyCard';
import { AllergyForm } from './AllergyForm';

export function AllergiesPage() {
  const crud = useRecordCrud<Allergy, AllergyInput>(allergiesApi, (a) => a.allergy_id);

  return (
    <RecordPage
      title="Allergies"
      subtitle="Substances that cause you a reaction, and how severe it is"
      addLabel="+ Add allergy"
      emptyMessage="No allergies recorded yet. Add one so it is on hand in an emergency."
      crud={crud}
      Form={AllergyForm}
      renderItem={(a) => <AllergyCard allergy={a} />}
      confirmDelete={(a) => `Remove "${a.allergen}" from your records?`}
    />
  );
}

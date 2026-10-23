import { RecordListScreen } from '@/components/records/RecordListScreen';

import { allergyApi } from './api';
import { AllergyCard } from './AllergyCard';

export function AllergiesScreen() {
  return (
    <RecordListScreen
      title="Allergies"
      api={allergyApi}
      formPath="/allergy-form"
      addLabel="Add allergy"
      emptyMessage="No allergies recorded yet. Add one so it is on hand in an emergency."
      getId={(a) => a.allergy_id}
      getLabel={(a) => `Edit allergy: ${a.allergen}`}
      renderItem={(a) => <AllergyCard item={a} />}
    />
  );
}

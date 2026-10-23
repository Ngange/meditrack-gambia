import { RecordListScreen } from '@/components/records/RecordListScreen';

import { conditionApi } from './api';
import { ConditionCard } from './ConditionCard';

export function ConditionsScreen() {
  return (
    <RecordListScreen
      title="Conditions"
      api={conditionApi}
      formPath="/condition-form"
      addLabel="Add condition"
      emptyMessage="No conditions recorded yet. Add a diagnosis to start your medical history."
      getId={(c) => c.condition_id}
      getLabel={(c) => `Edit condition: ${c.condition_name}`}
      renderItem={(c) => <ConditionCard item={c} />}
    />
  );
}

import { conditionsApi } from '../../api/conditions';
import { RecordPage } from '../../components/records/RecordPage';
import { useRecordCrud } from '../../hooks/useRecordCrud';
import type { Condition, ConditionInput } from '../../types/records';
import { ConditionCard } from './ConditionCard';
import { ConditionForm } from './ConditionForm';

export function ConditionsPage() {
  const crud = useRecordCrud<Condition, ConditionInput>(conditionsApi, (c) => c.condition_id);

  return (
    <RecordPage
      title="Medical history & conditions"
      subtitle="Diagnosed illnesses and ongoing health conditions"
      addLabel="+ Add condition"
      emptyMessage="No conditions recorded yet. Add a diagnosis to start your medical history."
      crud={crud}
      Form={ConditionForm}
      renderItem={(c) => <ConditionCard condition={c} />}
      confirmDelete={(c) => `Remove "${c.condition_name}" from your records?`}
    />
  );
}

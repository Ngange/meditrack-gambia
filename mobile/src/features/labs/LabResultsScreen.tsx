import { router } from 'expo-router';

import { RecordListScreen } from '@/components/records/RecordListScreen';

import { labResultApi } from './api';
import { LabResultCard } from './LabResultCard';

export function LabResultsScreen() {
  return (
    <RecordListScreen
      title="Lab results"
      api={labResultApi}
      formPath="/lab-result-form"
      addLabel="Add lab result"
      emptyMessage="No lab results recorded yet. Add a test result so you can show it to any doctor."
      getId={(r) => r.result_id}
      getLabel={(r) => `Edit lab result: ${r.test_name} on ${r.test_date}`}
      renderItem={(r) => <LabResultCard item={r} />}
      secondaryAction={{ label: 'Add several results', onPress: () => router.push('/lab-panel-form') }}
    />
  );
}

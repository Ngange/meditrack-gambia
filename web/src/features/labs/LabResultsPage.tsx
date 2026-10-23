import { useState } from 'react';
import { labResultsApi } from '../../api/labResults';
import { RecordPage } from '../../components/records/RecordPage';
import { useRecordCrud } from '../../hooks/useRecordCrud';
import type { LabResult, LabResultInput } from '../../types/records';
import { LabPanelForm } from './LabPanelForm';
import { LabResultCard } from './LabResultCard';
import { LabResultForm } from './LabResultForm';
import './LabPanelForm.css';

export function LabResultsPage() {
  const crud = useRecordCrud<LabResult, LabResultInput>(labResultsApi, (r) => r.result_id);
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <RecordPage
      title="Lab results"
      subtitle="Blood tests, scans and other results, with the normal range"
      addLabel="+ Add lab result"
      emptyMessage="No lab results recorded yet. Add a test result so you can show it to any doctor."
      crud={crud}
      Form={LabResultForm}
      renderItem={(r) => <LabResultCard lab={r} />}
      confirmDelete={(r) => `Remove "${r.test_name}" from your records?`}
      headerExtra={
        !panelOpen && (
          <button type="button" className="a-btn" onClick={() => setPanelOpen(true)}>
            + Add several results
          </button>
        )
      }>
      {panelOpen && (
        <LabPanelForm
          onCancel={() => setPanelOpen(false)}
          onSaved={() => {
            setPanelOpen(false);
            crud.reload();
          }}
        />
      )}
    </RecordPage>
  );
}

import { useState, type FormEvent } from 'react';
import { errorMessage, isAuthError } from '../../api/client';
import { labResultsApi } from '../../api/labResults';
import { today } from '../../utils/dates';
import { MAX_PANEL_ROWS, validatePanel, type PanelRow } from './panelValidation';

let nextId = 1;
const newRow = (): PanelRow => ({ id: nextId++, testName: '', result: '', referenceRange: '' });

type Props = { onSaved: () => void; onCancel: () => void };

// Enter every result from one lab visit at once: one date and lab, then a row per test.
export function LabPanelForm({ onSaved, onCancel }: Props) {
  const [testDate, setTestDate] = useState(today());
  const [facility, setFacility] = useState('');
  const [rows, setRows] = useState<PanelRow[]>(() => [newRow(), newRow(), newRow()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filled = rows.filter((r) => r.testName.trim()).length;
  const update = (id: number, patch: Partial<PanelRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { input, error: problem } = validatePanel({ testDate, facility, rows });
    setError(problem ?? '');
    if (!input) return;

    setSaving(true);
    try {
      await labResultsApi.createMany(input);
      onSaved();
    } catch (err) {
      if (!isAuthError(err)) setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="a-card a-form" onSubmit={handleSubmit} noValidate>
      <h2>Add several results</h2>
      <p className="a-muted">For results from the same visit to the lab. Leave spare rows empty.</p>

      <div className="a-row">
        <label className="a-field">
          <span>Date of tests</span>
          <input type="date" value={testDate} max={today()} onChange={(e) => setTestDate(e.target.value)} />
        </label>
        <label className="a-field">
          <span>Lab or facility (optional)</span>
          <input value={facility} maxLength={200} placeholder="e.g. EFSTH Laboratory" onChange={(e) => setFacility(e.target.value)} />
        </label>
      </div>

      {rows.map((row, i) => (
        <div key={row.id} className="a-row lab-panel-row">
          <label className="a-field">
            <span>Test {i + 1}</span>
            <input aria-label={`Test ${i + 1} name`} value={row.testName} maxLength={200} placeholder="e.g. Hemoglobin" onChange={(e) => update(row.id, { testName: e.target.value })} />
          </label>
          <label className="a-field">
            <span>Result</span>
            <input aria-label={`Test ${i + 1} result`} value={row.result} maxLength={1000} placeholder="e.g. 13.2 g/dL" onChange={(e) => update(row.id, { result: e.target.value })} />
          </label>
          <label className="a-field">
            <span>Normal range</span>
            <input aria-label={`Test ${i + 1} normal range`} value={row.referenceRange} maxLength={200} placeholder="e.g. 12 - 16" onChange={(e) => update(row.id, { referenceRange: e.target.value })} />
          </label>
          {rows.length > 1 && (
            <button type="button" className="a-btn a-btn-sm a-btn-danger" aria-label={`Remove test ${i + 1}`} onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}>
              ✕
            </button>
          )}
        </div>
      ))}

      <div>
        <button type="button" className="a-btn a-btn-sm" disabled={rows.length >= MAX_PANEL_ROWS} onClick={() => setRows((rs) => [...rs, newRow()])}>
          + Add another test
        </button>
      </div>

      {error && (
        <p className="a-error" role="alert">
          ⚠ {error}
        </p>
      )}

      <div className="a-actions">
        <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : filled > 1 ? `Save ${filled} results` : 'Save result'}
        </button>
        <button type="button" className="a-btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

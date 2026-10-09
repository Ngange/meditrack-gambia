import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  createCondition,
  deleteCondition,
  getConditions,
  updateCondition,
  type Condition,
  type ConditionStatus,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { getToken } from '../lib/auth-storage';
import './Allergies.css'; // shared stylesheet for the records pages

const STATUSES: ConditionStatus[] = ['active', 'chronic', 'resolved'];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Editing = null | 'new' | Condition;

export function ConditionsPage() {
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState<Editing>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ConditionStatus>('active');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAuthFailure = useCallback((err: unknown) => {
    const s = (err as { status?: number }).status;
    if (s === 401 || s === 403) {
      signOutRef.current();
      return true;
    }
    return false;
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const token = getToken();
      if (!token) {
        signOutRef.current();
        return;
      }
      const result = await getConditions(token);
      setConditions(result.conditions);
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    load();
  }, [load]);

  function openForm(target: Editing) {
    setEditing(target);
    setFormError('');
    if (target && target !== 'new') {
      setName(target.condition_name);
      setDate(target.diagnosis_date ?? '');
      setNotes(target.notes ?? '');
      setStatus(target.status);
    } else {
      setName('');
      setDate('');
      setNotes('');
      setStatus('active');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Condition name is required.');
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      if (!token) {
        signOutRef.current();
        return;
      }
      const input = { conditionName: name.trim(), diagnosisDate: date, status, notes: notes.trim() };
      if (editing && editing !== 'new') await updateCondition(token, editing.condition_id, input);
      else await createCondition(token, input);
      setEditing(null);
      await load();
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Condition) {
    if (!window.confirm(`Remove "${c.condition_name}" from your records?`)) return;
    setError('');
    try {
      const token = getToken();
      if (!token) {
        signOutRef.current();
        return;
      }
      await deleteCondition(token, c.condition_id);
      if (editing && editing !== 'new' && editing.condition_id === c.condition_id) setEditing(null);
      await load();
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setError((err as Error).message);
    }
  }

  return (
    <div className="allergies-page">
      <div className="allergies-inner">
        <Link to="/" className="allergies-back">
          ‹ Back to dashboard
        </Link>
        <div className="allergies-head">
          <h1>Conditions</h1>
          {editing === null && (
            <button type="button" className="a-btn a-btn-primary" onClick={() => openForm('new')}>
              Add condition
            </button>
          )}
        </div>

        {editing !== null && (
          <form className="a-card a-form" onSubmit={handleSubmit} noValidate>
            <h2>{editing === 'new' ? 'Add condition' : 'Edit condition'}</h2>

            <label className="a-field">
              <span>Condition</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Type 2 diabetes, hypertension"
                maxLength={200}
                autoFocus
              />
            </label>

            <div className="a-row">
              <label className="a-field">
                <span>Date diagnosed (optional)</span>
                <input
                  type="date"
                  value={date}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              <label className="a-field">
                <span>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as ConditionStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {capitalize(s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="a-field">
              <span>Notes (optional)</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Managed with diet and medication"
                maxLength={2000}
              />
            </label>

            {formError && (
              <p className="a-error" role="alert">
                ⚠ {formError}
              </p>
            )}

            <div className="a-actions">
              <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing === 'new' ? 'Save condition' : 'Save changes'}
              </button>
              <button type="button" className="a-btn" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="a-muted">Loading…</p>
        ) : error ? (
          <div className="a-card">
            <p className="a-error" role="alert">
              ⚠ {error}
            </p>
            <button type="button" className="a-btn" onClick={load}>
              Try again
            </button>
          </div>
        ) : conditions.length === 0 ? (
          <p className="a-muted">No conditions recorded yet. Add a diagnosis to start your medical history.</p>
        ) : (
          <ul className="a-list">
            {conditions.map((c) => (
              <li key={c.condition_id} className="a-card a-item">
                <div>
                  <strong>{c.condition_name}</strong>
                  <div className="a-muted">
                    {capitalize(c.status)}
                    {c.diagnosis_date ? ` · Diagnosed ${c.diagnosis_date}` : ''}
                  </div>
                  {c.notes && <div className="a-muted">{c.notes}</div>}
                </div>
                <div className="a-actions">
                  <button type="button" className="a-btn" onClick={() => openForm(c)}>
                    Edit
                  </button>
                  <button type="button" className="a-btn a-btn-danger" onClick={() => handleDelete(c)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
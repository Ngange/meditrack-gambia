import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createVisit, deleteVisit, getVisits, updateVisit, type Visit } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { getToken } from '../lib/auth-storage';
import './Allergies.css'; // shared page styles (cards, buttons, form fields)

// null = form closed, 'new' = adding, Visit = editing that one
type Editing = null | 'new' | Visit;

const today = () => new Date().toISOString().slice(0, 10);

export function VisitsPage() {
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState<Editing>(null);
  const [facility, setFacility] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
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
      const result = await getVisits(token);
      setVisits(result.visits);
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
      setFacility(target.facility_name ?? '');
      setDate(target.visit_date);
      setReason(target.reason ?? '');
      setDiagnosis(target.diagnosis ?? '');
      setTreatment(target.treatment ?? '');
      setNotes(target.notes ?? '');
    } else {
      setFacility('');
      setDate(today());
      setReason('');
      setDiagnosis('');
      setTreatment('');
      setNotes('');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!date) {
      setFormError('Visit date is required.');
      return;
    }
    if (!facility.trim() && !reason.trim()) {
      setFormError('Add the facility or the reason for the visit.');
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      if (!token) {
        signOutRef.current();
        return;
      }
      const input = {
        facilityName: facility.trim(),
        visitDate: date,
        reason: reason.trim(),
        diagnosis: diagnosis.trim(),
        treatment: treatment.trim(),
        notes: notes.trim(),
      };
      if (editing && editing !== 'new') await updateVisit(token, editing.visit_id, input);
      else await createVisit(token, input);
      setEditing(null);
      await load();
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: Visit) {
    const label = v.facility_name || 'this visit';
    if (!window.confirm(`Remove ${label} on ${v.visit_date} from your records?`)) return;
    setError('');
    try {
      const token = getToken();
      if (!token) {
        signOutRef.current();
        return;
      }
      await deleteVisit(token, v.visit_id);
      if (editing && editing !== 'new' && editing.visit_id === v.visit_id) setEditing(null);
      await load();
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setError((err as Error).message);
    }
  }

  return (
    <div className="allergies-page">
      <div className="allergies-inner">
        <div className="allergies-head">
          <div>
            <h1>Visits</h1>
            <p className="page-sub">Clinic and hospital visits, with what was found and what was done</p>
          </div>
          {editing === null && (
            <button type="button" className="a-btn a-btn-dark" onClick={() => openForm('new')}>
              + Add visit
            </button>
          )}
        </div>

        {editing !== null && (
          <form className="a-card a-form" onSubmit={handleSubmit} noValidate>
            <h2>{editing === 'new' ? 'Add visit' : 'Edit visit'}</h2>

            <div className="a-row">
              <label className="a-field">
                <span>Date of visit</span>
                <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="a-field">
                <span>Clinic or hospital</span>
                <input
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  placeholder="e.g. Edward Francis Small Teaching Hospital"
                  maxLength={200}
                  autoFocus
                />
              </label>
            </div>

            <label className="a-field">
              <span>Reason for visit</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Routine blood pressure check"
                maxLength={1000}
              />
            </label>

            <div className="a-row">
              <label className="a-field">
                <span>Diagnosis (optional)</span>
                <input
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Hypertension (controlled)"
                  maxLength={1000}
                />
              </label>
              <label className="a-field">
                <span>Treatment (optional)</span>
                <input
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  placeholder="e.g. Continue Amlodipine 5mg daily"
                  maxLength={2000}
                />
              </label>
            </div>

            <label className="a-field">
              <span>Notes (optional)</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
            </label>

            {formError && (
              <p className="a-error" role="alert">
                ⚠ {formError}
              </p>
            )}

            <div className="a-actions">
              <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing === 'new' ? 'Save visit' : 'Save changes'}
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
        ) : visits.length === 0 ? (
          <p className="a-muted">No visits recorded yet. Add a clinic or hospital visit to start your history.</p>
        ) : (
          <ul className="a-list">
            {visits.map((v) => (
              <li key={v.visit_id} className="a-card a-item">
                <div className="a-item-top">
                  <strong>{v.facility_name || 'Visit'}</strong>
                  <span className="a-pill">{v.visit_date}</span>
                </div>
                {v.reason && <div className="a-meta">Reason: {v.reason}</div>}
                {(v.diagnosis || v.treatment || v.notes) && (
                  <div className="a-note">
                    {v.diagnosis && <div>Diagnosis: {v.diagnosis}</div>}
                    {v.treatment && <div>Treatment: {v.treatment}</div>}
                    {v.notes && <div className="a-muted">{v.notes}</div>}
                  </div>
                )}
                <div className="a-actions">
                  <button type="button" className="a-btn a-btn-sm" onClick={() => openForm(v)}>
                    Edit
                  </button>
                  <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => handleDelete(v)}>
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
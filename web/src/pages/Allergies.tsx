import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  createAllergy,
  deleteAllergy,
  getAllergies,
  updateAllergy,
  type Allergy,
  type AllergyStatus,
  type Severity,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { getToken } from '../lib/auth-storage';
import './Allergies.css';

const SEVERITIES: Severity[] = ['mild', 'moderate', 'severe'];
const STATUSES: AllergyStatus[] = ['active', 'resolved'];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// null = form closed, 'new' = adding, Allergy = editing that one
type Editing = null | 'new' | Allergy;

export function AllergiesPage() {
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState<Editing>(null);
  const [allergen, setAllergen] = useState('');
  const [reaction, setReaction] = useState('');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [status, setStatus] = useState<AllergyStatus>('active');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Returns true when the failure was an auth problem (already signed out).
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
      const result = await getAllergies(token);
      setAllergies(result.allergies);
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
      setAllergen(target.allergen);
      setReaction(target.reaction ?? '');
      setSeverity(target.severity ?? '');
      setStatus(target.status);
    } else {
      setAllergen('');
      setReaction('');
      setSeverity('');
      setStatus('active');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!allergen.trim()) {
      setFormError('Allergen is required.');
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
        allergen: allergen.trim(),
        reaction: reaction.trim(),
        severity: severity || null,
        status,
      };
      if (editing && editing !== 'new') await updateAllergy(token, editing.allergy_id, input);
      else await createAllergy(token, input);
      setEditing(null);
      await load();
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: Allergy) {
    if (!window.confirm(`Remove "${a.allergen}" from your records?`)) return;
    setError('');
    try {
      const token = getToken();
      if (!token) {
        signOutRef.current();
        return;
      }
      await deleteAllergy(token, a.allergy_id);
      if (editing && editing !== 'new' && editing.allergy_id === a.allergy_id) setEditing(null);
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
            <h1>Allergies</h1>
            <p className="page-sub">Substances that cause you a reaction, and how severe it is</p>
          </div>
          {editing === null && (
            <button type="button" className="a-btn a-btn-dark" onClick={() => openForm('new')}>
              + Add allergy
            </button>
          )}
        </div>

        {editing !== null && (
          <form className="a-card a-form" onSubmit={handleSubmit} noValidate>
            <h2>{editing === 'new' ? 'Add allergy' : 'Edit allergy'}</h2>

            <label className="a-field">
              <span>Allergen</span>
              <input
                value={allergen}
                onChange={(e) => setAllergen(e.target.value)}
                placeholder="e.g. Penicillin, peanuts"
                maxLength={200}
                autoFocus
              />
            </label>

            <label className="a-field">
              <span>Reaction (optional)</span>
              <input
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
                placeholder="e.g. Rash, swelling"
                maxLength={1000}
              />
            </label>

            <div className="a-row">
              <label className="a-field">
                <span>Severity (optional)</span>
                <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity | '')}>
                  <option value="">Not specified</option>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {capitalize(s)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="a-field">
                <span>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as AllergyStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {capitalize(s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {formError && (
              <p className="a-error" role="alert">
                ⚠ {formError}
              </p>
            )}

            <div className="a-actions">
              <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing === 'new' ? 'Save allergy' : 'Save changes'}
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
        ) : allergies.length === 0 ? (
          <p className="a-muted">No allergies recorded yet. Add one so it is on hand in an emergency.</p>
        ) : (
          <ul className="a-list">
            {allergies.map((a) => (
                            <li key={a.allergy_id} className="a-card a-item">
                <div className="a-item-top">
                  <strong>{a.allergen}</strong>
                  <span className={`a-pill${a.severity === 'severe' && a.status === 'active' ? ' a-pill-red' : ''}`}>
                    {a.status === 'resolved' ? 'Resolved' : a.severity ? capitalize(a.severity) : 'Active'}
                  </span>
                </div>
                <div className="a-meta">
                  {capitalize(a.status)}
                  {a.severity ? ` · ${capitalize(a.severity)} severity` : ''}
                </div>
                {a.reaction && <div className="a-note">{a.reaction}</div>}
                <div className="a-actions">
                  <button type="button" className="a-btn a-btn-sm" onClick={() => openForm(a)}>
                    Edit
                  </button>
                  <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => handleDelete(a)}>
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
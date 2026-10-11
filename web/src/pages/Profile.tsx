import { useState, type FormEvent } from 'react';
import { updateMyProfile } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { getToken } from '../lib/auth-storage';
import { useShell } from '../components/AppShell';
import './Allergies.css'; // shared page styles (cards, buttons, form fields)
import './Profile.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// True only for a real calendar date written as YYYY-MM-DD (rejects 1998-02-30, 1998-2-3, ...).
function isRealDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// "1998-07-21" -> "21 Jul 1998" (by hand, so it never depends on locale or timezone)
function formatDate(s: string) {
  const [y, m, d] = s.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function Item({ label, value, wide, children }: { label: string; value?: string | null; wide?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`profile-item${wide ? ' is-wide' : ''}`}>
      <dt>{label}</dt>
      <dd className={value || children ? undefined : 'is-empty'}>{children ?? value ?? 'Not provided'}</dd>
    </div>
  );
}

export function ProfilePage() {
  const { signOut } = useAuth();
  const { profile, profileLoading, profileError, setProfile, reloadProfile } = useShell();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    if (!profile) return;
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setDob(profile.date_of_birth ?? '');
    setGender(profile.gender ?? '');
    setBloodGroup(profile.blood_group ?? '');
    setContactName(profile.emergency_contact_name ?? '');
    setContactPhone(profile.emergency_contact_phone ?? '');
    setFormError('');
    setEditing(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!firstName.trim() || !lastName.trim()) {
      setFormError('First name and last name are required.');
      return;
    }
    const d = dob.trim();
    if (d && !isRealDate(d)) {
      setFormError('Enter a real date of birth in the format YYYY-MM-DD, e.g. 1998-07-21.');
      return;
    }
    if (d && d > new Date().toISOString().slice(0, 10)) {
      setFormError('Date of birth cannot be in the future.');
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      if (!token) {
        signOut();
        return;
      }
      const result = await updateMyProfile(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: d,
        gender: gender.trim(),
        bloodGroup,
        emergencyContactName: contactName.trim(),
        emergencyContactPhone: contactPhone.trim(),
      });
      setProfile(result.profile); // also updates the "Hi, ..." greeting in the header
      setEditing(false);
    } catch (err) {
      const s = (err as { status?: number }).status;
      if (s === 401 || s === 403) {
        signOut();
        return;
      }
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (profileLoading) return <p className="a-muted">Loading…</p>;

  if (profileError || !profile) {
    return (
      <div className="a-card">
        <p className="a-error" role="alert">⚠ {profileError || 'Profile not found.'}</p>
        <div className="a-actions" style={{ marginTop: 12 }}>
          <button type="button" className="a-btn" onClick={reloadProfile}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="allergies-page">
      <div className="a-card profile-card">
        <div className="profile-head">
          <h2>{editing ? 'Edit profile' : 'Patient profile & health identity'}</h2>
          {!editing && (
            <button type="button" className="a-btn a-btn-dark" onClick={startEdit}>Edit profile</button>
          )}
        </div>

        {editing ? (
          <form className="a-form" onSubmit={handleSave} noValidate>
            <div className="a-row">
              <label className="a-field">
                First name
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} />
              </label>
              <label className="a-field">
                Last name
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} />
              </label>
            </div>
            <div className="a-row">
              <label className="a-field">
                Date of birth (optional)
                <input
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  inputMode="numeric"
                  maxLength={10}
                />
              </label>
              <label className="a-field">
                Gender (optional)
                <input value={gender} onChange={(e) => setGender(e.target.value)} maxLength={20} />
              </label>
              <label className="a-field">
                Blood group (optional)
                <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                  <option value="">Not set</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="a-row">
              <label className="a-field">
                Emergency contact name (optional)
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={150} />
              </label>
              <label className="a-field">
                Emergency contact phone (optional)
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+220 ..."
                  inputMode="tel"
                  maxLength={30}
                />
              </label>
            </div>

            {formError ? <p className="a-error" role="alert">⚠ {formError}</p> : null}

            <div className="a-actions">
              <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="a-btn" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="profile-grid">
            <Item label="Full name" value={`${profile.first_name} ${profile.last_name}`} />
            <Item label="Date of birth" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
            <Item label="Blood group">
              {profile.blood_group ? <span className="profile-blood">{profile.blood_group}</span> : undefined}
            </Item>
            <Item label="Gender" value={profile.gender} />
            <Item label="Email" value={profile.email} />
            <Item
              label="Emergency contact"
              value={
                profile.emergency_contact_name
                  ? `${profile.emergency_contact_name}${profile.emergency_contact_phone ? ` - ${profile.emergency_contact_phone}` : ''}`
                  : null
              }
            />
          </dl>
        )}
      </div>
    </div>
  );
}
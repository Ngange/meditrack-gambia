import { useState } from 'react';
import { updateMyProfile } from '../../api/profile';
import { errorMessage, isAuthError } from '../../api/client';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Loading } from '../../components/ui/Loading';
import { useShell } from '../../hooks/useShell';
import type { ProfileInput } from '../../types/profile';
import { ProfileForm } from './ProfileForm';
import { ProfileView } from './ProfileView';
import './Profile.css';

export function ProfilePage() {
  const { profile, profileLoading, profileError, setProfile, reloadProfile } = useShell();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(input: ProfileInput) {
    setError('');
    setSaving(true);
    try {
      setProfile(await updateMyProfile(input)); // also updates the "Hi, ..." greeting in the header
      setEditing(false);
    } catch (err) {
      if (!isAuthError(err)) setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (profileLoading) return <Loading />;
  if (profileError || !profile) return <ErrorCard message={profileError || 'Profile not found.'} onRetry={reloadProfile} />;

  return (
    <div className="allergies-page">
      <div className="a-card profile-card">
        <div className="profile-head">
          <h2>{editing ? 'Edit profile' : 'Patient profile & health identity'}</h2>
          {!editing && (
            <button
              type="button"
              className="a-btn a-btn-dark"
              onClick={() => {
                setError('');
                setEditing(true);
              }}>
              Edit profile
            </button>
          )}
        </div>

        {editing ? (
          <ProfileForm profile={profile} saving={saving} error={error} onSubmit={save} onCancel={() => setEditing(false)} />
        ) : (
          <ProfileView profile={profile} />
        )}
      </div>
    </div>
  );
}

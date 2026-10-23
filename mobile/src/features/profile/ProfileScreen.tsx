import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { getProfile } from '@/api';
import { KeyboardScreen } from '@/components/layout/KeyboardScreen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ErrorNotice } from '@/components/ui/error-notice';
import { useFocusLoad } from '@/hooks/useFocusLoad';

import { ProfileDetails } from './ProfileDetails';
import { ProfileForm } from './ProfileForm';

export function ProfileScreen() {
  const { data: profile, loading, error, retry, setData } = useFocusLoad(getProfile);
  const [editing, setEditing] = useState(false);

  return (
    <KeyboardScreen>
      <ScreenHeader
        title={editing ? 'Edit profile' : 'My profile'}
        backLabel={editing ? 'Cancel' : 'Back'}
        onBack={() => (editing ? setEditing(false) : router.back())}
      />

      {loading ? (
        <ActivityIndicator />
      ) : !profile ? (
        <ErrorNotice message={error || 'Profile not found.'} onRetry={retry} />
      ) : editing ? (
        <ProfileForm
          profile={profile}
          onSaved={(updated) => {
            setData(updated);
            setEditing(false);
          }}
        />
      ) : (
        <ProfileDetails profile={profile} onEdit={() => setEditing(true)} />
      )}
    </KeyboardScreen>
  );
}

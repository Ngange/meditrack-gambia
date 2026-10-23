import { StyleSheet } from 'react-native';

import type { Profile } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { formatDate } from '@/utils/dates';

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <Card>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText themeColor={value ? undefined : 'textSecondary'}>{value ?? 'Not provided'}</ThemedText>
    </Card>
  );
}

export function ProfileDetails({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  return (
    <ThemedView style={styles.list}>
      <Row label="First name" value={profile.first_name} />
      <Row label="Last name" value={profile.last_name} />
      <Row label="Date of birth" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
      <Row label="Gender" value={profile.gender} />
      <Row label="Blood group" value={profile.blood_group} />
      <Row label="Emergency contact" value={profile.emergency_contact_name} />
      <Row label="Emergency phone" value={profile.emergency_contact_phone} />
      <ThemedView style={styles.action}>
        <Button title="Edit profile" onPress={onEdit} />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  action: { marginTop: Spacing.two },
});

import { router } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet } from 'react-native';

import type { Summary } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ErrorNotice } from '@/components/ui/error-notice';
import { PressableCard } from '@/components/ui/pressable-card';
import { Spacing } from '@/constants/theme';
import { RECORD_TYPES } from '@/features/records/recordTypes';
import { useFocusLoad } from '@/hooks/useFocusLoad';

import { greeting } from './greeting';
import { loadHome } from './loadHome';
import { SummaryTiles } from './SummaryTiles';

const totalRecords = (s: Summary) => RECORD_TYPES.reduce((sum, t) => sum + s[t.key], 0);

export function HomeScreen() {
  // Reloads whenever the tab comes back into focus, so counts are fresh after adding records.
  const { data, loading, error, refreshing, retry, refresh } = useFocusLoad(loadHome);

  const profile = data?.profile ?? null;
  const needsEmergencyInfo = profile !== null && (!profile.blood_group || !profile.emergency_contact_name);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <ThemedView style={styles.heading}>
          <ThemedText themeColor="textSecondary">{greeting()}</ThemedText>
          <ThemedText type="title">{profile ? profile.first_name : 'MediTrack'}</ThemedText>
        </ThemedView>

        {loading ? (
          <ActivityIndicator style={styles.spinner} />
        ) : error || !data ? (
          <ErrorNotice message={error || 'Could not load your records.'} onRetry={retry} style={styles.error} />
        ) : (
          <>
            <SummaryTiles summary={data.summary} />

            {totalRecords(data.summary) === 0 ? (
              <ThemedText themeColor="textSecondary">
                No records yet. Start with your allergies and conditions — they are the first things a doctor
                will ask about.
              </ThemedText>
            ) : null}

            {needsEmergencyInfo ? (
              <PressableCard label="Complete your emergency information" onPress={() => router.push('/profile')}>
                <ThemedText type="smallBold">Complete your emergency info</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Add your blood group and an emergency contact so they are on hand when it matters.
                </ThemedText>
              </PressableCard>
            ) : null}

            <PressableCard label="All health records" onPress={() => router.push('/records')}>
              <ThemedText type="smallBold">All health records</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Browse and add allergies, conditions, visits, medications and more
              </ThemedText>
            </PressableCard>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  heading: { gap: Spacing.one },
  spinner: { marginTop: Spacing.five },
  error: { marginTop: Spacing.four },
});

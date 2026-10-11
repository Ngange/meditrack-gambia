import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { getProfile, getSummary, type Profile, type Summary } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getToken } from '@/lib/auth-storage';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// One tile per record type. Add an entry here (and in the backend summary) as new types are built.
const TILES = [
  { key: 'allergies', label: 'Allergies', href: '/allergies' },
  { key: 'conditions', label: 'Conditions', href: '/conditions' },
] as const;

export default function HomeScreen() {
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const token = await getToken();
      if (!token) {
        await signOutRef.current();
        return;
      }
      const [p, s] = await Promise.all([getProfile(token), getSummary(token)]);
      setProfile(p.profile);
      setSummary(s.summary);
    } catch (err) {
      const status = (err as any).status;
      if (status === 401 || status === 403) {
        await signOutRef.current();
        return;
      }
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever the tab comes back into focus, so counts are fresh after adding records.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const needsEmergencyInfo = profile !== null && (!profile.blood_group || !profile.emergency_contact_name);
  const total = summary ? summary.allergies + summary.conditions : 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }>
        <ThemedView style={styles.heading}>
          <ThemedText themeColor="textSecondary">{greeting()}</ThemedText>
          <ThemedText type="title">{profile ? profile.first_name : 'MediTrack'}</ThemedText>
        </ThemedView>

        {loading ? (
          <ActivityIndicator style={styles.spinner} />
        ) : error ? (
          <ThemedView style={styles.errorBox}>
            <ThemedText themeColor="error">⚠ {error}</ThemedText>
            <Button title="Try again" onPress={load} />
          </ThemedView>
        ) : (
          <>
            <ThemedView style={styles.tileRow}>
              {TILES.map((t) => (
                <Pressable
                  key={t.key}
                  style={styles.tileWrap}
                  onPress={() => router.push(t.href)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.label}: ${summary ? summary[t.key] : 0} recorded`}>
                  <ThemedView type="backgroundElement" style={styles.tile}>
                    <ThemedText type="title">{summary ? summary[t.key] : 0}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t.label}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </ThemedView>

            {total === 0 ? (
              <ThemedText themeColor="textSecondary">
                No records yet. Start with your allergies and conditions — they are the first things a doctor
                will ask about.
              </ThemedText>
            ) : null}

            {needsEmergencyInfo ? (
              <Pressable
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel="Complete your emergency information">
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">Complete your emergency info</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Add your blood group and an emergency contact so they are on hand when it matters.
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => router.push('/records')}
              accessibilityRole="button"
              accessibilityLabel="All health records">
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">All health records</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Browse and add allergies, conditions and more
                </ThemedText>
              </ThemedView>
            </Pressable>
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
  errorBox: { gap: Spacing.three, marginTop: Spacing.four },
  tileRow: { flexDirection: 'row', gap: Spacing.three },
  tileWrap: { flex: 1 },
  tile: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
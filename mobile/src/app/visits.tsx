import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { getVisits, type Visit } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getToken } from '@/lib/auth-storage';

export default function VisitsScreen() {
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const token = await getToken();
      if (!token) {
        await signOutRef.current();
        return;
      }
      const result = await getVisits(token);
      setVisits(result.visits);
    } catch (err) {
      const status = (err as any).status;
      if (status === 401 || status === 403) {
        await signOutRef.current();
        return;
      }
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openForm(v?: Visit) {
    router.push({
      pathname: '/visit-form',
      params: v
        ? {
            id: v.visit_id,
            facility: v.facility_name ?? '',
            date: v.visit_date,
            reason: v.reason ?? '',
            diagnosis: v.diagnosis ?? '',
            treatment: v.treatment ?? '',
            notes: v.notes ?? '',
          }
        : {},
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <ThemedText type="linkPrimary">‹ Back</ThemedText>
          </Pressable>
          <ThemedText type="title">Visits</ThemedText>
        </ThemedView>

        {loading ? (
          <ActivityIndicator style={styles.center} />
        ) : error ? (
          <ThemedView style={styles.center}>
            <ThemedText themeColor="error">⚠ {error}</ThemedText>
            <Button title="Try again" onPress={load} />
          </ThemedView>
        ) : (
          <FlatList
            data={visits}
            keyExtractor={(v) => v.visit_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary">
                No visits recorded yet. Add a clinic or hospital visit to start your medical history.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openForm(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit visit on ${item.visit_date}${item.facility_name ? ` at ${item.facility_name}` : ''}`}>
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{item.facility_name || 'Visit'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.visit_date}
                  </ThemedText>
                  {item.reason ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Reason: {item.reason}
                    </ThemedText>
                  ) : null}
                  {item.diagnosis ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Diagnosis: {item.diagnosis}
                    </ThemedText>
                  ) : null}
                </ThemedView>
              </Pressable>
            )}
          />
        )}

        <Button title="Add visit" onPress={() => openForm()} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  header: { gap: Spacing.two },
  center: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  list: { gap: Spacing.two, flexGrow: 1 },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { getConditions, type Condition } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getToken } from '@/lib/auth-storage';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ConditionsScreen() {
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [conditions, setConditions] = useState<Condition[]>([]);
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
      const result = await getConditions(token);
      setConditions(result.conditions);
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

  function openForm(c?: Condition) {
    router.push({
      pathname: '/condition-form',
      params: c
        ? {
            id: c.condition_id,
            name: c.condition_name,
            date: c.diagnosis_date ?? '',
            notes: c.notes ?? '',
            status: c.status,
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
          <ThemedText type="title">Conditions</ThemedText>
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
            data={conditions}
            keyExtractor={(c) => c.condition_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary">
                No conditions recorded yet. Add a diagnosis to start your medical history.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openForm(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit condition: ${item.condition_name}`}>
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{item.condition_name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {capitalize(item.status)}
                    {item.diagnosis_date ? ` · Diagnosed ${item.diagnosis_date}` : ''}
                  </ThemedText>
                  {item.notes ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.notes}
                    </ThemedText>
                  ) : null}
                </ThemedView>
              </Pressable>
            )}
          />
        )}

        <Button title="Add condition" onPress={() => openForm()} />
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
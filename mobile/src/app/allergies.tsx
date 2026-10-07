import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { getAllergies, type Allergy } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getToken } from '@/lib/auth-storage';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AllergiesScreen() {
  const { signOut } = useAuth();
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  const [allergies, setAllergies] = useState<Allergy[]>([]);
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
      const result = await getAllergies(token);
      setAllergies(result.allergies);
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

  // Reload every time the screen comes back into focus (e.g. after saving in the form).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openForm(a?: Allergy) {
    router.push({
      pathname: '/allergy-form',
      params: a
        ? {
            id: a.allergy_id,
            allergen: a.allergen,
            reaction: a.reaction ?? '',
            severity: a.severity ?? '',
            status: a.status,
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
          <ThemedText type="title">Allergies</ThemedText>
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
            data={allergies}
            keyExtractor={(a) => a.allergy_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary">
                No allergies recorded yet. Add one so it is on hand in an emergency.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openForm(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit allergy: ${item.allergen}`}>
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{item.allergen}</ThemedText>
                  {item.reaction ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.reaction}
                    </ThemedText>
                  ) : null}
                  <ThemedText
                    type="small"
                    themeColor={item.severity === 'severe' && item.status === 'active' ? 'error' : 'textSecondary'}>
                    {item.severity ? `${capitalize(item.severity)} · ` : ''}
                    {capitalize(item.status)}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            )}
          />
        )}

        <Button title="Add allergy" onPress={() => openForm()} />
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
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { DangerLink } from '@/components/ui/danger-link';
import { ErrorNotice } from '@/components/ui/error-notice';
import { FormError } from '@/components/ui/form-error';
import { Spacing } from '@/constants/theme';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { confirmDestructive } from '@/utils/confirm';

import { accessApi, type ActiveAccess } from './accessApi';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** "Who has seen my record": doctors who can open it now (with End access) and a plain-language history. */
export function AccessHistoryCard() {
  const { data, loading, error, retry } = useFocusLoad(accessApi.history);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');

  function run(id: string, title: string, message: string, label: string, action: () => Promise<unknown>) {
    confirmDestructive(
      title,
      message,
      async () => {
        setBusy(id);
        setActionError('');
        try {
          await action();
          retry();
        } catch (err) {
          setActionError(errorMessage(err));
        } finally {
          setBusy('');
        }
      },
      label,
    );
  }

  const endOne = (a: ActiveAccess) =>
    run(a.session_id, `End ${a.doctor}'s access?`, 'They will need your PIN to open your record again.', 'End access', () => accessApi.endSession(a.session_id));
  const endAll = () => run('all', 'End access for every doctor?', 'Each of them will need your PIN to open your record again.', 'End all', () => accessApi.endAll());

  if (loading && !data) return <ActivityIndicator />;
  if (error || !data) return <ErrorNotice message={error || 'Could not load your access history.'} onRetry={retry} />;

  return (
    <>
      <ThemedText type="subtitle" accessibilityRole="header">
        Who has seen my record
      </ThemedText>
      <FormError message={actionError} />

      <ThemedText type="smallBold">Open now</ThemedText>
      {data.active.length === 0 ? (
        <ThemedText themeColor="textSecondary">No doctor has your record open.</ThemedText>
      ) : (
        <>
          {data.active.map((a) => (
            <Card key={a.session_id}>
              <ThemedText type="smallBold">
                {a.doctor}
                {a.facility ? `, ${a.facility}` : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Opened {when(a.started_at)} · open until {clock(a.expires_at)}
              </ThemedText>
              <DangerLink label="End access" busyLabel="Ending…" busy={busy === a.session_id} disabled={busy !== ''} onPress={() => endOne(a)} />
            </Card>
          ))}
          {data.active.length > 1 ? <DangerLink label="End all access" busyLabel="Ending…" busy={busy === 'all'} disabled={busy !== ''} onPress={endAll} /> : null}
        </>
      )}

      <ThemedText type="smallBold">History</ThemedText>
      {data.history.length === 0 ? (
        <ThemedText themeColor="textSecondary">Nobody has opened your record yet.</ThemedText>
      ) : (
        data.history.map((e) => (
          <Card key={e.id} style={styles.event}>
            <ThemedText type="smallBold" themeColor={e.type === 'wrong_pin' ? 'error' : 'text'}>
              {e.type === 'wrong_pin' ? '⚠ ' : ''}
              {e.title}
            </ThemedText>
            {e.detail ? (
              <ThemedText type="small" themeColor="textSecondary">
                {e.detail}
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              {when(e.at)}
            </ThemedText>
          </Card>
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  event: { gap: Spacing.one },
});

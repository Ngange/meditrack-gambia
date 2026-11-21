import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DangerLink } from '@/components/ui/danger-link';
import { ErrorNotice } from '@/components/ui/error-notice';
import { FormError } from '@/components/ui/form-error';
import { Spacing } from '@/constants/theme';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { confirmDestructive } from '@/utils/confirm';

import { AccessCard } from './AccessCard';
import { AccessHistoryCard } from './AccessHistoryCard';
import { shareApi } from './api';
import { sendLink } from './sendLink';
import {
  SHARE_DURATION_LABELS,
  SHARE_DURATIONS,
  SHARE_SECTION_LABELS,
  SHARE_SECTIONS,
  type CreatedShare,
  type Share,
  type ShareDuration,
  type ShareSection,
} from './types';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function ShareRow({ share, onRevoked, onError }: { share: Share; onRevoked: () => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const label = share.record_types.map((t) => SHARE_SECTION_LABELS[t] ?? t).join(', ');
  const opened = `Opened ${share.view_count} ${share.view_count === 1 ? 'time' : 'times'}${share.last_viewed_at ? ` · last ${when(share.last_viewed_at)}` : ''}`;
  const ends =
    share.status === 'active' ? `Expires ${when(share.expires_at)}` : share.status === 'revoked' ? `Turned off ${when(share.revoked_at ?? share.expires_at)}` : `Expired ${when(share.expires_at)}`;

  function turnOff() {
    confirmDestructive(
      'Turn off this link?',
      'Anyone who has it will no longer be able to open it.',
      async () => {
        setBusy(true);
        try {
          await shareApi.revoke(share.share_id);
          onRevoked();
        } catch (err) {
          onError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      },
      'Turn off',
    );
  }

  return (
    <Card accessible accessibilityLabel={`Link sharing ${label}, ${share.status}`}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {share.status === 'active' ? (
        <ThemedText type="small" themeColor="primary">
          Active
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">{opened}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{ends}</ThemedText>
      {share.status === 'active' ? <DangerLink label="Turn off this link" busyLabel="Turning off…" busy={busy} onPress={turnOff} /> : null}
    </Card>
  );
}

export function ShareScreen() {
  const { data: shares, loading, error, retry, setData } = useFocusLoad(shareApi.list);

  const [picked, setPicked] = useState<ShareSection[]>(['allergies', 'conditions', 'medications']);
  const [duration, setDuration] = useState<ShareDuration>('24h');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [created, setCreated] = useState<CreatedShare | null>(null);
  const [sendNote, setSendNote] = useState('');

  const toggle = (s: ShareSection) => setPicked((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const reloadList = () => shareApi.list().then(setData).catch(() => {});

  async function create() {
    if (picked.length === 0) {
      setFormError('Tick at least one thing to share.');
      return;
    }
    setCreating(true);
    setFormError('');
    try {
      setCreated(await shareApi.create(picked, duration));
      setSendNote('');
      void reloadList();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function send() {
    if (!created) return;
    try {
      setSendNote((await sendLink(created.url)) === 'copied' ? 'Link copied.' : '');
    } catch {
      setSendNote('Could not send the link. Try again.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Share</ThemedText>
      <ThemedText themeColor="textSecondary">
        Let a doctor see your records, with a PIN or with a private link.
      </ThemedText>

      <AccessCard />
      <AccessHistoryCard />

      <ThemedText type="subtitle" accessibilityRole="header">
        Or send a link
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        For a doctor without an account. They see only what you tick, read only. Your name and blood group are always shown.
      </ThemedText>

      {created ? (
        <Card>
          <ThemedText type="smallBold">Your link is ready</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Send it now. For your safety it is shown only once.
          </ThemedText>
          <ThemedText selectable type="small" style={styles.url}>
            {created.url}
          </ThemedText>
          <Button title="Send link" onPress={send} />
          {sendNote ? <ThemedText type="small" themeColor="textSecondary">{sendNote}</ThemedText> : null}
          <Button title="Done" variant="secondary" onPress={() => setCreated(null)} />
        </Card>
      ) : (
        <ThemedView style={styles.form}>
          <ThemedText type="smallBold">What to share</ThemedText>
          <ThemedView style={styles.row}>
            {SHARE_SECTIONS.map((s) => (
              <Chip key={s} label={SHARE_SECTION_LABELS[s]} selected={picked.includes(s)} onPress={() => toggle(s)} />
            ))}
          </ThemedView>
          <ThemedText type="smallBold">Works for</ThemedText>
          <ThemedView style={styles.row}>
            {SHARE_DURATIONS.map((d) => (
              <Chip key={d} label={SHARE_DURATION_LABELS[d]} selected={duration === d} onPress={() => setDuration(d)} />
            ))}
          </ThemedView>
          <FormError message={formError} />
          <Button title="Create link" onPress={create} loading={creating} />
        </ThemedView>
      )}

      <ThemedText type="subtitle" accessibilityRole="header">
        Your links
      </ThemedText>
      {loading ? (
        <ActivityIndicator />
      ) : error && !shares ? (
        <ErrorNotice message={error} onRetry={retry} />
      ) : !shares || shares.length === 0 ? (
        <ThemedText themeColor="textSecondary">You have not shared anything yet.</ThemedText>
      ) : (
        shares.map((s) => <ShareRow key={s.share_id} share={s} onRevoked={reloadList} onError={setFormError} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.four, gap: Spacing.three },
  form: { gap: Spacing.three, backgroundColor: 'transparent' },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  url: { fontFamily: 'monospace' },
});

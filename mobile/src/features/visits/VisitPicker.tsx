import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';

import { visitApi } from './api';
import type { Visit } from './types';

const SHOWN = 8;
const describe = (v: Visit) => `${v.visit_date} · ${v.facility_name || v.reason || 'Visit'}`.slice(0, 48);

/** "Which visit was this from?" An optional link from a record to one of the patient's visits. */
export function VisitPicker({ value, onChange }: { value: string | null; onChange: (visitId: string | null) => void }) {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    visitApi
      .list()
      .then((list) => alive && setVisits(list))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  let content;
  if (failed) {
    content = (
      <ThemedText type="small" themeColor="textSecondary">
        Could not load your visits. You can link this later.
      </ThemedText>
    );
  } else if (!visits) {
    content = (
      <ThemedText type="small" themeColor="textSecondary">
        Loading visits…
      </ThemedText>
    );
  } else if (visits.length === 0) {
    content = (
      <ThemedText type="small" themeColor="textSecondary">
        No visits recorded yet. Add the visit first to link this to it.
      </ThemedText>
    );
  } else {
    // The newest few, plus the one already chosen even if it is older.
    const shown = visits.slice(0, SHOWN);
    const chosen = visits.find((v) => v.visit_id === value);
    if (chosen && !shown.includes(chosen)) shown.push(chosen);
    content = (
      <ThemedView style={styles.row}>
        <Chip label="No visit" selected={value === null} onPress={() => onChange(null)} accessibilityLabel="No visit" />
        {shown.map((v) => (
          <Chip
            key={v.visit_id}
            label={describe(v)}
            selected={value === v.visit_id}
            onPress={() => onChange(v.visit_id)}
            accessibilityLabel={`Link to visit on ${v.visit_date}${v.facility_name ? ` at ${v.facility_name}` : ''}`}
          />
        ))}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.group}>
      <ThemedText type="smallBold">From which visit? (optional)</ThemedText>
      {content}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});

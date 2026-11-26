import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ErrorNotice } from '@/components/ui/error-notice';
import { Spacing } from '@/constants/theme';
import { useDoctor } from '@/context/DoctorContext';
import { goDoctor, replaceDoctor } from '@/doctor/nav';
import { doctorApi, type DoctorDocument, type DoctorRecord, type PatientBasics } from '@/doctor/api';

import { KINDS, type Kind } from './kinds';
import { clock, useCountdown } from './useCountdown';

type Tab = Kind['key'] | 'documents';

const DOC_LABELS: Record<string, string> = {
  prescription: 'Prescription',
  lab_report: 'Lab report',
  discharge_summary: 'Discharge summary',
  medical_certificate: 'Medical certificate',
  other: 'Other',
};

export function DoctorPatientScreen() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const { doctor } = useDoctor();
  const [patient, setPatient] = useState<PatientBasics | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ended, setEnded] = useState<'me' | 'time' | null>(null);
  const left = useCountdown(expires);

  const [tab, setTab] = useState<Tab>('allergies');
  const [records, setRecords] = useState<DoctorRecord[] | null>(null);
  const [docs, setDocs] = useState<DoctorDocument[] | null>(null);
  const [listError, setListError] = useState('');

  useEffect(() => {
    doctorApi
      .getSession(sid)
      .then((d) => {
        setPatient(d.patient);
        setExpires(d.session.expires_at);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [sid]);

  const loadList = useCallback(() => {
    setListError('');
    if (tab === 'documents') {
      setDocs(null);
      doctorApi.documents(sid).then(setDocs).catch((err) => setListError(errorMessage(err)));
    } else {
      setRecords(null);
      doctorApi.list(sid, tab).then(setRecords).catch((err) => setListError(errorMessage(err)));
    }
  }, [sid, tab]);

  // Loads when the tab changes, and again when coming back from the add/edit form.
  useFocusEffect(loadList);

  async function end() {
    try {
      await doctorApi.end(sid);
      setEnded('me');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (ended || (expires && left === 0)) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="title">{ended === 'me' ? 'Access ended' : 'Your hour is up'}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          To continue, scan the patient&apos;s QR code again.
        </ThemedText>
        <Button title="Back to scan" onPress={() => replaceDoctor('/doctor')} />
      </ThemedView>
    );
  }

  const kind = KINDS.find((k) => k.key === tab);

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        {error && !patient ? (
          <ErrorNotice message={error} onRetry={() => replaceDoctor('/doctor')} />
        ) : !patient ? (
          <ActivityIndicator />
        ) : (
          <Card>
            <ThemedText type="subtitle">
              {patient.first_name} {patient.last_name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Blood group {patient.blood_group || 'not recorded'}
              {patient.date_of_birth ? ` · Born ${patient.date_of_birth}` : ''}
              {patient.gender ? ` · ${patient.gender}` : ''}
            </ThemedText>
            {patient.emergency_contact_name || patient.emergency_contact_phone ? (
              <ThemedText type="small" themeColor="textSecondary">
                Emergency contact: {patient.emergency_contact_name || '—'}
                {patient.emergency_contact_phone ? ` · ${patient.emergency_contact_phone}` : ''}
              </ThemedText>
            ) : null}
            <ThemedText type="smallBold">Access ends in {clock(left)}</ThemedText>
            <Button title="End access" variant="secondary" onPress={end} />
          </Card>
        )}

        <ThemedView style={styles.tabs}>
          {KINDS.map((k) => (
            <Chip key={k.key} label={k.label} selected={tab === k.key} onPress={() => setTab(k.key)} />
          ))}
          <Chip label="Documents" selected={tab === 'documents'} onPress={() => setTab('documents')} />
        </ThemedView>

        {kind ? (
          <Button
            title={`Add ${kind.noun}`}
            onPress={() => goDoctor('/doctor/form', { sid, kind: kind.key })}
          />
        ) : null}

        {listError ? (
          <ErrorNotice message={listError} onRetry={loadList} />
        ) : tab === 'documents' ? (
          docs === null ? (
            <ActivityIndicator />
          ) : docs.length === 0 ? (
            <ThemedText themeColor="textSecondary">No documents.</ThemedText>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Documents can be read on the web portal. They are not opened on the phone.
              </ThemedText>
              {docs.map((d) => (
                <Card key={d.document_id}>
                  <ThemedText type="smallBold">{d.file_name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[DOC_LABELS[d.document_type] ?? d.document_type, d.document_date].filter(Boolean).join(' · ')}
                  </ThemedText>
                  {d.description ? <ThemedText type="small">{d.description}</ThemedText> : null}
                </Card>
              ))}
            </>
          )
        ) : records === null ? (
          <ActivityIndicator />
        ) : records.length === 0 ? (
          <ThemedText themeColor="textSecondary">Nothing recorded yet.</ThemedText>
        ) : (
          records.map((r, i) => {
            const mine = !!doctor && r.entered_by?.provider_id === doctor.provider_id;
            return (
              <Card key={i}>
                <ThemedText type="smallBold">{kind!.title(r)}</ThemedText>
                {kind!.lines(r).filter(Boolean).map((line, j) => (
                  <ThemedText key={j} type="small" themeColor="textSecondary">
                    {line}
                  </ThemedText>
                ))}
                {r.entered_by ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Added by {mine ? 'you' : r.entered_by.name}
                  </ThemedText>
                ) : null}
                {mine ? (
                  <Button
                    title="Edit"
                    variant="secondary"
                    onPress={() => goDoctor('/doctor/form', { sid, kind: kind!.key, item: JSON.stringify(r) })}
                  />
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  center: { flex: 1, padding: Spacing.four, gap: Spacing.three, justifyContent: 'center' },
  centerText: { textAlign: 'left' },
});

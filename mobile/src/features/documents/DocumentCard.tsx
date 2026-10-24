import { useState } from 'react';

import { errorMessage, isAuthError } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { showMessage } from '@/utils/notify';

import { openDocument } from './openDocument';
import { DOCUMENT_TYPE_LABELS, type MedicalDocument } from './types';

export function DocumentCard({ item }: { item: MedicalDocument }) {
  const [opening, setOpening] = useState(false);

  async function handleOpen() {
    setOpening(true);
    try {
      await openDocument(item);
    } catch (err) {
      if (!isAuthError(err)) showMessage('Could not open the document', errorMessage(err));
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <ThemedText type="smallBold">{item.file_name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {DOCUMENT_TYPE_LABELS[item.document_type]} ·{' '}
        {item.document_date ? `Dated ${item.document_date}` : `Added ${item.upload_date.slice(0, 10)}`}
      </ThemedText>
      {item.description ? (
        <ThemedText type="small" themeColor="textSecondary">
          {item.description}
        </ThemedText>
      ) : null}
      <Button title="Open" variant="secondary" onPress={handleOpen} loading={opening} accessibilityLabel={`Open ${item.file_name}`} />
    </>
  );
}

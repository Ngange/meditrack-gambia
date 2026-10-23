import { router } from 'expo-router';
import { useState } from 'react';

import { errorMessage, isAuthError, type RecordApi } from '@/api';
import { confirmDestructive } from '@/utils/confirm';

type FormApi<I> = Pick<RecordApi<unknown, I>, 'create' | 'update' | 'remove'>;

/**
 * Saving and deleting for a record form. Pass the id when editing.
 * On success it closes the form, which sends the user back to the (reloading) list.
 */
export function useRecordForm<I>(api: FormApi<I>, id?: string) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  async function run(action: () => Promise<unknown>, setBusy: (busy: boolean) => void) {
    setFormError('');
    setBusy(true);
    try {
      await action();
      router.back();
    } catch (err) {
      if (!isAuthError(err)) setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const submit = (input: I) => run(() => (id ? api.update(id, input) : api.create(input)), setSaving);

  const confirmRemove = (title: string, message: string) => {
    if (!id) return;
    confirmDestructive(title, message, () => void run(() => api.remove(id), setDeleting));
  };

  return { isEdit: Boolean(id), saving, deleting, formError, submit, confirmRemove };
}

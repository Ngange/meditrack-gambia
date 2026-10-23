import { useState } from 'react';
import type { RecordApi } from '../api/records';
import { errorMessage, isAuthError } from '../api/client';
import { useFetch } from './useFetch';

// null = form closed, 'new' = adding, an item = editing that one
export type Editing<T> = null | 'new' | T;

// Everything a records page needs: the list, the add/edit form state, and save / delete.
export function useRecordCrud<T, I>(api: RecordApi<T, I>, getId: (item: T) => string) {
  const { data, loading, error: loadError, reload } = useFetch(api.list);

  const [editing, setEditing] = useState<Editing<T>>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const editingItem = editing !== null && editing !== 'new' ? (editing as T) : null;

  function openNew() {
    setFormError('');
    setEditing('new');
  }

  function openEdit(item: T) {
    setFormError('');
    setEditing(item);
  }

  function closeForm() {
    setEditing(null);
  }

  async function save(input: I) {
    setFormError('');
    setSaving(true);
    try {
      if (editingItem) await api.update(getId(editingItem), input);
      else await api.create(input);
      setEditing(null);
      reload();
    } catch (err) {
      if (!isAuthError(err)) setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: T) {
    setActionError('');
    try {
      await api.remove(getId(item));
      if (editingItem && getId(editingItem) === getId(item)) setEditing(null);
      reload();
    } catch (err) {
      if (!isAuthError(err)) setActionError(errorMessage(err));
    }
  }

  return {
    items: data ?? [],
    loading,
    error: loadError || actionError,
    reload: () => {
      setActionError('');
      reload();
    },
    getId,
    editing,
    editingItem,
    openNew,
    openEdit,
    closeForm,
    save,
    saving,
    formError,
    remove,
  };
}

export type RecordCrud<T, I> = ReturnType<typeof useRecordCrud<T, I>>;

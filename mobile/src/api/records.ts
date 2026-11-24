import { activeStore } from '@/offline/active';
import type { WritableType } from '@/offline/types';

/** Set on a record a doctor entered; missing or null when the patient entered it. */
export type EnteredBy = { provider_id: string; name: string; facility: string | null };

export type RecordApi<T, I> = {
  list: () => Promise<T[]>;
  create: (input: I) => Promise<T>;
  update: (id: string, input: I) => Promise<T>;
  remove: (id: string) => Promise<void>;
};

const WRITABLE = ['allergies', 'conditions', 'visits', 'medications', 'lab_results'];

/**
 * One API object per record type, answered from the phone's own saved copy, so every screen works with no
 * connection. Saving a change puts it in the queue to be sent when the phone can reach the server (see
 * offline/). `plural` is the record kind ('allergies', 'visits', 'lab_results', ...). `singular` and `path`
 * are kept for the callers that name them; documents are the one kind that is read from the phone but
 * changed only online (their files live on the server), see features/documents/api.ts.
 */
export function createRecordApi<T, I>(plural: string, _singular?: string, _path?: string): RecordApi<T, I> {
  const type = plural as WritableType;
  const checkWritable = () => {
    if (!WRITABLE.includes(plural)) throw new Error('This kind of record can only be changed online.');
  };
  return {
    list: () => activeStore().list<T>(type),
    async create(input) {
      checkWritable();
      return (await activeStore().create(type, input as Record<string, unknown>)) as unknown as T;
    },
    async update(id, input) {
      checkWritable();
      return (await activeStore().update(type, id, input as Record<string, unknown>)) as unknown as T;
    },
    async remove(id) {
      checkWritable();
      await activeStore().remove(type, id);
    },
  };
}

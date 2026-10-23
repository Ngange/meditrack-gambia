import { request } from './client';

export type RecordApi<T, I> = {
  list: () => Promise<T[]>;
  create: (input: I) => Promise<T>;
  update: (id: string, input: I) => Promise<T>;
  remove: (id: string) => Promise<void>;
};

/**
 * One API object per record type. The backend answers with { [plural]: T[] } for lists and
 * { [singular]: T } for single records, so allergies, conditions, visits and medications
 * all share this one implementation.
 */
export function createRecordApi<T, I>(plural: string, singular: string): RecordApi<T, I> {
  const base = `/records/${plural}`;
  return {
    async list() {
      const res = await request<Record<string, T[]>>(base);
      return res[plural] ?? [];
    },
    async create(input) {
      const res = await request<Record<string, T>>(base, { method: 'POST', body: input });
      return res[singular];
    },
    async update(id, input) {
      const res = await request<Record<string, T>>(`${base}/${id}`, { method: 'PUT', body: input });
      return res[singular];
    },
    async remove(id) {
      await request<{ deleted: boolean }>(`${base}/${id}`, { method: 'DELETE' });
    },
  };
}

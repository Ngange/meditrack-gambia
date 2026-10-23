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
 * all share this one implementation. `path` is the URL segment when it differs from the response key
 * (lab results answer as `lab_results` but live at /records/lab-results).
 */
export function createRecordApi<T, I>(plural: string, singular: string, path = plural): RecordApi<T, I> {
  const base = `/records/${path}`;
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

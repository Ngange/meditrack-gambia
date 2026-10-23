import { request } from './client';

// What every record type (allergies, conditions, visits, medications) can do.
export type RecordApi<T, I> = {
  list: () => Promise<T[]>;
  create: (input: I) => Promise<T>;
  update: (id: string, input: I) => Promise<T>;
  remove: (id: string) => Promise<void>;
};

// plural is the key of the list ("allergies"); singular is the key of one item ("allergy").
// path is the URL segment when it differs from plural (lab results answer as lab_results at /records/lab-results).
export function createRecordApi<T, I>(plural: string, singular: string, path = plural): RecordApi<T, I> {
  const base = `/records/${path}`;

  return {
    async list() {
      const data = await request<Record<string, T[]>>(base);
      return data[plural];
    },
    async create(input) {
      const data = await request<Record<string, T>>(base, { method: 'POST', body: input });
      return data[singular];
    },
    async update(id, input) {
      const data = await request<Record<string, T>>(`${base}/${id}`, { method: 'PUT', body: input });
      return data[singular];
    },
    async remove(id) {
      await request<{ deleted: boolean }>(`${base}/${id}`, { method: 'DELETE' });
    },
  };
}

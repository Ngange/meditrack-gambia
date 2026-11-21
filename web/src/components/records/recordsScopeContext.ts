import { createContext } from 'react';

// Who is looking at the record pages: the patient themself, or a doctor with the patient open.
export type RecordsScope = { mode: 'patient' } | { mode: 'doctor'; providerId: string };

export const RecordsScopeContext = createContext<RecordsScope>({ mode: 'patient' });

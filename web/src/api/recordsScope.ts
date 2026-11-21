// Where the record pages read and write. A patient's own records live under /records. While a doctor
// has a patient open, the same pages are pointed at that session instead, so the doctor sees the same
// forms and lists without a second copy of them. Set by RecordsScopeProvider; read at call time.
let base = '/records';

export const getRecordsBase = () => base;
export const setRecordsBase = (next: string) => {
  base = next;
};

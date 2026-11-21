import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { setRecordsBase } from '../../api/recordsScope';
import { RecordsScopeContext } from './recordsScopeContext';

// Points the record pages inside it at one doctor session. A layout effect, because those run before
// any page's own loading effect, so the first request already goes to the right place.
export function RecordsScopeProvider({ sessionId, providerId, children }: { sessionId: string; providerId: string; children: ReactNode }) {
  useLayoutEffect(() => {
    setRecordsBase(`/provider/sessions/${sessionId}/records`);
    return () => setRecordsBase('/records');
  }, [sessionId]);

  const value = useMemo(() => ({ mode: 'doctor' as const, providerId }), [providerId]);
  return <RecordsScopeContext.Provider value={value}>{children}</RecordsScopeContext.Provider>;
}

import { useContext } from 'react';
import { RecordsScopeContext } from './recordsScopeContext';

export const useRecordsScope = () => useContext(RecordsScopeContext);

import { ApiError } from '@/api/client';

import type { LocalStore } from './store';

// The open account's store, for the API modules the screens call. appSession.ts keeps it up to date.
let current: LocalStore | null = null;

export const setActiveStore = (store: LocalStore | null) => {
  current = store;
};

export function activeStore(): LocalStore {
  // Looks like any other "not signed in" answer, which the screens ignore while the login screen takes over.
  if (!current) throw new ApiError('Please sign in.', 401);
  return current;
}

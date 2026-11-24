import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

import { ApiError, deviceRefresh, login, register, setOnlineBlocked, setTokenProvider } from '@/api';
import { API_URL } from '@/config/env';

import { setActiveStore } from './active';
import { deleteExpoDb, openExpoDb } from './expoDb';
import { Session, type AuthApi, type AuthResult, type SecureKV } from './session';
import { createHttpTransport } from './transport';
import { SyncAuthError, SyncNetworkError } from './types';
import { toHex } from './verifier';

// Secure storage keys may only contain letters, digits, '.', '-' and '_'. Session's keys follow that.
const secure: SecureKV = {
  get: (k) => SecureStore.getItemAsync(k),
  set: (k, v) => SecureStore.setItemAsync(k, v),
  del: (k) => SecureStore.deleteItemAsync(k),
};

const api: AuthApi = {
  login: (email, password, device) => login(email, password, device) as Promise<AuthResult>,
  register: (email, password, first, last, device) => register(email, password, first, last, device) as Promise<AuthResult>,
  deviceRefresh: (key) => deviceRefresh(key) as Promise<AuthResult>,
};

/** The one Session for the whole app. */
export const session: Session = new Session({
  secure,
  api,
  openDb: openExpoDb,
  deleteDb: deleteExpoDb,
  randomHex: (n) => toHex(Crypto.getRandomBytes(n)),
  newId: () => Crypto.randomUUID(),
  deviceName: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || 'Android phone',
  makeTransport: (getToken, tokenRefused) => createHttpTransport({ baseUrl: API_URL!, getToken, tokenRefused }),
});

// Online calls (Share, documents, profile edits, file downloads) get their token from the session, which renews
// it with the device key when needed. If it cannot, they fail with an ordinary error; syncing keeps the queue safe.
setTokenProvider(async () => {
  try {
    return await session.ensureToken();
  } catch (err) {
    if (err instanceof SyncNetworkError) throw new ApiError('Unable to reach the server. Check your connection.', 0, true);
    if (err instanceof SyncAuthError) throw new ApiError('Sign in again to use online features. Your data on this phone is safe.', 400);
    throw err;
  }
});

/** Keeps the API modules and the "no calls while sync is off" rule in step with the open account. */
export async function bindSession() {
  const store = session.store;
  setActiveStore(store);
  const on = store ? await session.syncEnabled() : true;
  setOnlineBlocked(on ? null : 'Online sync is switched off. Turn it on in More to use this.');
}

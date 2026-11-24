import { jwtDecode } from 'jwt-decode';

import { EncryptionUnavailableError, type Db } from './db';
import { SyncEngine, type SyncSummary } from './engine';
import { LocalStore } from './store';
import { SyncAuthError, SyncNetworkError, type Transport } from './types';
import { checkVerifier, makeVerifier, sha256Hex, type Verifier } from './verifier';

/** The phone's secure storage (expo-secure-store in the app). */
export interface SecureKV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

export type DeviceInfo = { name: string; platform: 'android'; deviceKey?: string };
export type AuthResult = {
  token: string;
  user: { userId: string; email: string; role: 'patient' | 'admin' | 'provider' };
  device?: { device_id: string; device_key: string };
};

/** The server's sign-in calls. Errors carry `status`, and `isNetworkError` when the server could not be reached. */
export interface AuthApi {
  login(email: string, password: string, device: DeviceInfo): Promise<AuthResult>;
  register(email: string, password: string, firstName: string, lastName: string, device: DeviceInfo): Promise<AuthResult>;
  deviceRefresh(deviceKey: string): Promise<AuthResult>;
}

export type Account = { id: string; email: string; userId: string };

export type SessionDeps = {
  secure: SecureKV;
  api: AuthApi;
  /** Opens (creating if needed) the encrypted database `file` with the 64-hex-character key. */
  openDb(file: string, keyHex: string): Promise<Db>;
  deleteDb(file: string): Promise<void>;
  randomHex(bytes: number): string;
  makeTransport(getToken: () => Promise<string>, tokenRefused: () => void): Transport;
  deviceName: string;
  now?: () => number;
  newId?: () => string;
};

export type SyncState = {
  running: boolean;
  /** Why the last sync did not finish. null = fine. */
  problem: null | 'offline' | 'auth' | 'server';
  message: string | null;
  /** The device key was refused (or none): a password sign-in is needed before syncing again. */
  needsSignIn: boolean;
  last: SyncSummary | null;
  lastAt: number | null;
};

export type SignInOutcome = { account: Account; mode: 'online' | 'offline'; recovered: boolean };

const k = {
  accounts: 'mt.accounts',
  active: 'mt.active',
  acct: (id: string) => `mt.${id}.acct`,
  verifier: (id: string) => `mt.${id}.verifier`,
  dbkey: (id: string) => `mt.${id}.dbkey`,
  device: (id: string) => `mt.${id}.device`,
  token: (id: string) => `mt.${id}.token`,
  sync: (id: string) => `mt.${id}.sync`,
};
const dbFile = (id: string) => `meditrack_${id}.db`;
export const accountId = (email: string) => sha256Hex(email.trim().toLowerCase()).slice(0, 32);

type Active = { account: Account; store: LocalStore; engine: SyncEngine; deviceId: string | null };

const isNetwork = (e: unknown) => (e as { isNetworkError?: boolean } | null)?.isNetworkError === true;
const statusOf = (e: unknown) => (e as { status?: number } | null)?.status ?? 0;

/**
 * Who is signed in on this phone and everything that goes with it: one encrypted database per account,
 * kept after sign-out; sign-in with no connection; and a way to get a fresh login token from the server
 * without the password (the device key), so the patient is not asked to sign in again after being offline.
 */
export class Session {
  private active: Active | null = null;
  private listeners = new Set<() => void>();
  private refreshing: Promise<string> | null = null;
  state: SyncState = { running: false, problem: null, message: null, needsSignIn: false, last: null, lastAt: null };

  constructor(private d: SessionDeps) {}

  private now() {
    return (this.d.now ?? Date.now)();
  }

  // ---- observers ---------------------------------------------------------------------------------

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }
  private set(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  get current() {
    return this.active?.account ?? null;
  }
  get store() {
    return this.active?.store ?? null;
  }

  // ---- accounts kept on the phone ---------------------------------------------------------------

  async accounts(): Promise<Account[]> {
    const raw = await this.d.secure.get(k.accounts);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  }
  private async saveAccount(a: Account) {
    const all = (await this.accounts()).filter((x) => x.id !== a.id);
    all.push(a);
    await this.d.secure.set(k.accounts, JSON.stringify(all));
  }

  /** Opens the account that was signed in when the app last closed. No connection needed. */
  async restore(): Promise<{ account: Account; recovered: boolean } | null> {
    const id = await this.d.secure.get(k.active);
    if (!id) return null;
    const account = (await this.accounts()).find((a) => a.id === id);
    if (!account) {
      await this.d.secure.del(k.active);
      return null;
    }
    const recovered = await this.open(account);
    return { account, recovered };
  }

  // ---- signing in ---------------------------------------------------------------------------------

  async signIn(email: string, password: string): Promise<SignInOutcome> {
    const id = accountId(email);
    const known = (await this.accounts()).find((a) => a.id === id) ?? null;
    const syncOn = (await this.d.secure.get(k.sync(id))) !== '0';

    if (known && !syncOn) return this.signInOffline(known, email, password); // online sync is switched off: stay off the network

    let result: AuthResult;
    try {
      result = await this.d.api.login(email.trim(), password, await this.deviceInfo(id));
    } catch (err) {
      if (isNetwork(err) && known) return this.signInOffline(known, email, password);
      if (isNetwork(err)) {
        throw new Error('Unable to reach the server. An account can only be opened without a connection on a phone it has already been signed in on.');
      }
      throw err;
    }
    return this.finishOnline(id, password, result);
  }

  async signUp(email: string, password: string, firstName: string, lastName: string): Promise<SignInOutcome> {
    const id = accountId(email);
    const result = await this.d.api.register(email.trim(), password, firstName, lastName, await this.deviceInfo(id));
    return this.finishOnline(id, password, result);
  }

  /** Signs in again, online, as the account that is already open (device key refused, or password changed). Local data stays. */
  async reauth(password: string) {
    const a = this.active;
    if (!a) throw new Error('Please sign in.');
    const result = await this.d.api.login(a.account.email, password, await this.deviceInfo(a.account.id));
    if (result.user.userId !== a.account.userId) throw new Error('That password belongs to a different account.');
    await this.persistLogin(a.account.id, password, result);
    a.deviceId = result.device?.device_id ?? a.deviceId;
    this.set({ needsSignIn: false, problem: null, message: null });
  }

  private async deviceInfo(id: string): Promise<DeviceInfo> {
    const raw = await this.d.secure.get(k.device(id));
    const key = raw ? (JSON.parse(raw) as { key: string }).key : undefined;
    return { name: this.d.deviceName, platform: 'android', ...(key ? { deviceKey: key } : {}) };
  }

  private async finishOnline(id: string, password: string, result: AuthResult): Promise<SignInOutcome> {
    // The phone app is for patients. Nothing is saved for anyone else, so no half-signed-in state is left behind.
    if (result.user.role === 'provider') throw new Error('Doctor accounts use the MediTrack web app. Please log in there.');
    if (result.user.role !== 'patient') throw new Error('This app is for patients.');
    await this.persistLogin(id, password, result);
    const account: Account = { id, email: result.user.email, userId: result.user.userId };
    await this.saveAccount(account);
    const recovered = await this.activate(account);
    // A phone that has not downloaded anything for this account yet gets its records before the app opens.
    if (!(await this.active?.store.getMeta('profile'))) await this.sync();
    return { account, mode: 'online', recovered };
  }

  /** Remembers what an online sign-in gave: the way to check the password offline, the login token and the device key. */
  private async persistLogin(id: string, password: string, result: AuthResult) {
    const salt = this.d.randomHex(16);
    await this.d.secure.set(k.verifier(id), JSON.stringify(await makeVerifier(password, salt)));
    if (result.device) await this.d.secure.set(k.device(id), JSON.stringify({ id: result.device.device_id, key: result.device.device_key }));
    await this.d.secure.set(k.token(id), result.token);
  }

  private async signInOffline(account: Account, email: string, password: string): Promise<SignInOutcome> {
    const raw = await this.d.secure.get(k.verifier(account.id));
    // The server compares emails exactly as typed when the account was made, so this does too.
    const ok = raw && email.trim() === account.email ? await checkVerifier(password, JSON.parse(raw) as Verifier) : false;
    if (!ok) throw new Error('Invalid email or password.');
    const recovered = await this.activate(account);
    return { account, mode: 'offline', recovered };
  }

  private async activate(account: Account) {
    await this.close();
    const recovered = await this.open(account);
    await this.d.secure.set(k.active, account.id);
    this.set({ needsSignIn: false, problem: null, message: null });
    return recovered;
  }

  /** Opens the account's database. If the secure key no longer opens it (the phone was restored, say), it is replaced by an empty one and downloaded again. */
  private async open(account: Account): Promise<boolean> {
    let key = await this.d.secure.get(k.dbkey(account.id));
    let recovered = false;
    const file = dbFile(account.id);
    const tryOpen = async () => {
      const db = await this.d.openDb(file, key!);
      try {
        return await LocalStore.open(db, { newId: this.d.newId, now: () => new Date(this.now()).toISOString() });
      } catch (e) {
        await db.close().catch(() => undefined);
        throw e;
      }
    };
    let store: LocalStore;
    if (!key) {
      key = this.d.randomHex(32);
      await this.d.secure.set(k.dbkey(account.id), key);
      await this.d.deleteDb(file).catch(() => undefined); // a leftover file without its key cannot be read
      store = await tryOpen();
    } else {
      try {
        store = await tryOpen();
      } catch (err) {
        if (err instanceof EncryptionUnavailableError) throw err; // nothing is wrong with the saved data
        recovered = true;
        await this.d.deleteDb(file).catch(() => undefined);
        store = await tryOpen();
      }
    }
    const device = await this.d.secure.get(k.device(account.id));
    const active: Active = {
      account,
      store,
      deviceId: device ? (JSON.parse(device) as { id: string }).id : null,
      engine: undefined as unknown as SyncEngine,
    };
    active.engine = new SyncEngine(
      store,
      this.d.makeTransport(() => this.ensureToken(), () => void this.forgetToken()),
      () => active.deviceId ?? '',
    );
    this.active = active;
    this.set({ running: false, problem: null, message: null, last: null, lastAt: null, needsSignIn: active.deviceId === null });
    return recovered;
  }

  private async close() {
    const a = this.active;
    this.active = null;
    this.refreshing = null;
    if (a) await a.store.close().catch(() => undefined);
  }

  /** Signs out. The account's data stays on the phone, encrypted. */
  async signOut() {
    const a = this.active;
    await this.close();
    if (a) await this.d.secure.del(k.token(a.account.id));
    await this.d.secure.del(k.active);
    this.set({ running: false, problem: null, message: null, needsSignIn: false, last: null, lastAt: null });
  }

  /** Removes one account's data from the phone (the records, the keys, the way to sign in offline). Changes not yet sent are lost. */
  async clearAccount(id: string) {
    if (this.active?.account.id === id) await this.signOut();
    await this.d.deleteDb(dbFile(id)).catch(() => undefined);
    for (const key of [k.acct, k.verifier, k.dbkey, k.device, k.token, k.sync]) await this.d.secure.del(key(id));
    await this.d.secure.set(k.accounts, JSON.stringify((await this.accounts()).filter((a) => a.id !== id)));
  }

  // ---- the login token ---------------------------------------------------------------------------

  private async forgetToken() {
    if (this.active) await this.d.secure.del(k.token(this.active.account.id));
  }

  private tokenFresh(token: string) {
    try {
      const { exp } = jwtDecode<{ exp: number }>(token);
      return exp * 1000 - 60_000 > this.now();
    } catch {
      return false;
    }
  }

  /** A login token the server will accept: the saved one, or a new one got with the device key. Never asks for the password. */
  ensureToken(): Promise<string> {
    if (this.refreshing) return this.refreshing;
    const run = this.fetchToken().finally(() => {
      this.refreshing = null;
    });
    this.refreshing = run;
    return run;
  }

  private async fetchToken(): Promise<string> {
    const a = this.active;
    if (!a) throw new SyncAuthError('Please sign in.');
    const saved = await this.d.secure.get(k.token(a.account.id));
    if (saved && this.tokenFresh(saved)) return saved;

    const raw = await this.d.secure.get(k.device(a.account.id));
    if (!raw) {
      this.set({ needsSignIn: true });
      throw new SyncAuthError();
    }
    try {
      const res = await this.d.api.deviceRefresh((JSON.parse(raw) as { key: string }).key);
      // Keep the replacement key before anything else: the old one only works for a few minutes.
      if (res.device) await this.d.secure.set(k.device(a.account.id), JSON.stringify({ id: res.device.device_id, key: res.device.device_key }));
      await this.d.secure.set(k.token(a.account.id), res.token);
      a.deviceId = res.device?.device_id ?? a.deviceId;
      if (this.state.needsSignIn) this.set({ needsSignIn: false });
      return res.token;
    } catch (err) {
      if (isNetwork(err) || statusOf(err) >= 500 || statusOf(err) === 429) throw new SyncNetworkError();
      this.set({ needsSignIn: true });
      throw new SyncAuthError();
    }
  }

  // ---- the switch ---------------------------------------------------------------------------------

  async syncEnabled(id = this.active?.account.id) {
    return id ? (await this.d.secure.get(k.sync(id))) !== '0' : true;
  }
  async setSyncEnabled(on: boolean) {
    const a = this.active;
    if (!a) return;
    await this.d.secure.set(k.sync(a.account.id), on ? '1' : '0');
    this.set({ problem: null, message: null });
  }

  // ---- syncing ------------------------------------------------------------------------------------

  /** Sends waiting changes and fetches new ones. Returns null when nothing was attempted (switch off, nobody signed in). Never throws. */
  async sync(): Promise<SyncSummary | null> {
    const a = this.active;
    if (!a || !(await this.syncEnabled(a.account.id))) return null;
    if (this.state.running) return null;
    this.set({ running: true });
    let retried = false;
    for (;;) {
      try {
        const summary = await a.engine.syncNow();
        if (this.active !== a) return null; // signed out meanwhile
        this.set({ running: false, problem: null, message: null, last: summary, lastAt: this.now(), needsSignIn: false });
        return summary;
      } catch (err) {
        if (err instanceof SyncAuthError && !retried && this.active === a) {
          retried = true; // the saved token may just have been refused: get a new one with the device key and try once more
          await this.forgetToken();
          continue;
        }
        if (this.active !== a) return null;
        if (err instanceof SyncNetworkError) this.set({ running: false, problem: 'offline', message: err.message });
        else if (err instanceof SyncAuthError) this.set({ running: false, problem: 'auth', message: err.message, needsSignIn: true });
        else this.set({ running: false, problem: 'server', message: err instanceof Error ? err.message : 'Sync failed.' });
        return null;
      }
    }
  }
}

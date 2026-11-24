import * as SQLite from 'expo-sqlite';

import { EncryptionUnavailableError, type Db, type SqlValue } from './db';

// One open connection per account file, kept for as long as the app runs. Signing out and in again reuses it:
// closing and reopening the same SQLCipher file on Android proved fragile (NativeDatabase.execAsync rejected with
// a NullPointerException on the second open). The file stays encrypted on disk either way.
const raw = new Map<string, { db: SQLite.SQLiteDatabase; key: string; wrapped: Db }>();

/**
 * Opens an encrypted SQLite file (SQLCipher; the `expo-sqlite` config plugin in app.json turns it on).
 * `keyHex` is a 256-bit key as 64 hex characters, kept in the phone's secure storage. `PRAGMA key` has to be
 * the first thing run on the connection. A wrong key shows up as an error on the first read.
 */
export async function openExpoDb(file: string, keyHex: string): Promise<Db> {
  const existing = raw.get(file);
  if (existing && existing.key === keyHex) return existing.wrapped;
  if (existing) await dropConnection(file); // same file, different key: start again

  const db = await SQLite.openDatabaseAsync(file);
  try {
    await db.execAsync(`PRAGMA key = "x'${keyHex}'";`);
    // Plain SQLite quietly ignores PRAGMA key and would store everything unencrypted. SQLCipher answers with its version.
    if (!(await db.getFirstAsync('PRAGMA cipher_version'))) throw new EncryptionUnavailableError();
    await db.getFirstAsync('SELECT count(*) AS n FROM sqlite_master'); // fails here if the key is wrong
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  } catch (err) {
    await db.closeAsync().catch(() => undefined);
    throw err;
  }
  const wrapped: Db = {
    exec: (sql) => db.execAsync(sql),
    async run(sql, params: SqlValue[] = []) {
      await db.runAsync(sql, params);
    },
    all: <T,>(sql: string, params: SqlValue[] = []) => db.getAllAsync<T>(sql, params),
    first: <T,>(sql: string, params: SqlValue[] = []) => db.getFirstAsync<T>(sql, params),
    transaction: (fn) => {
      let result: Awaited<ReturnType<typeof fn>>;
      return db
        .withTransactionAsync(async () => {
          result = await fn();
        })
        .then(() => result);
    },
    close: async () => undefined, // the connection stays open; see the note at the top
  };
  raw.set(file, { db, key: keyHex, wrapped });
  return wrapped;
}

async function dropConnection(file: string) {
  const c = raw.get(file);
  raw.delete(file);
  if (c) await c.db.closeAsync().catch(() => undefined);
}

export async function deleteExpoDb(file: string) {
  await dropConnection(file);
  await SQLite.deleteDatabaseAsync(file);
}

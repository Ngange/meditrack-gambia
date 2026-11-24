export type SqlValue = string | number | null;

/**
 * The little the app needs from a SQLite database. The phone uses expo-sqlite (expoDb.ts, encrypted with
 * SQLCipher); the Node tests use node:sqlite. Everything above this file is the same code in both.
 */
export interface Db {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  /** Runs `fn` as one all-or-nothing step. Calls must not overlap; the store queues them. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** The build has no SQLCipher, so the database would be saved without encryption. The app refuses rather than do that. */
export class EncryptionUnavailableError extends Error {
  constructor() {
    super(
      'This build of the app has no database encryption, so it will not store health records. In app.json, plugins, add ["expo-sqlite", { "useSQLCipher": true }] and make a new development build (npx expo run:android).',
    );
    this.name = 'EncryptionUnavailableError';
  }
}

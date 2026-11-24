import type { Db } from './db';

/** Each entry upgrades the database by one version. Never edit an old entry; add a new one. */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE records (
    type      TEXT NOT NULL,
    id        TEXT NOT NULL,
    json      TEXT NOT NULL,
    base_json TEXT,
    version   INTEGER NOT NULL DEFAULT 0,
    pending   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (type, id)
  );
  CREATE INDEX records_type ON records (type);
  CREATE TABLE queue (
    seq          INTEGER PRIMARY KEY AUTOINCREMENT,
    type         TEXT NOT NULL,
    id           TEXT NOT NULL,
    op           TEXT NOT NULL,
    base_version INTEGER,
    data         TEXT,
    sending      INTEGER NOT NULL DEFAULT 0,
    chained      INTEGER NOT NULL DEFAULT 0,
    attempts     INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL
  );
  CREATE INDEX queue_record ON queue (type, id);
  CREATE TABLE conflicts (
    type           TEXT NOT NULL,
    id             TEXT NOT NULL,
    op             TEXT NOT NULL,
    data           TEXT,
    server_record  TEXT NOT NULL,
    server_version INTEGER NOT NULL,
    created_at     TEXT NOT NULL,
    PRIMARY KEY (type, id)
  );
  CREATE TABLE rejected (
    seq        INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    id         TEXT NOT NULL,
    op         TEXT NOT NULL,
    code       TEXT NOT NULL,
    message    TEXT NOT NULL,
    data       TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
];

export async function migrate(db: Db) {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  for (let v = from; v < MIGRATIONS.length; v++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[v]);
      await db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

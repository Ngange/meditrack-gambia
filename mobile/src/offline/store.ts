import type { Db, SqlValue } from './db';
import { buildRecord, compareRecords } from './mapping';
import { migrate } from './schema';
import {
  ID_KEY,
  type AnyRecord,
  type Conflict,
  type ConflictRow,
  type FeedItem,
  type Op,
  type QueueRow,
  type RecordType,
  type Rejected,
  type RejectedRow,
  type SyncResponse,
  type WritableType,
} from './types';

type RecordRow = { type: RecordType; id: string; json: string; base_json: string | null; version: number; pending: number };

export type StoreOptions = {
  newId?: () => string;
  now?: () => string;
};

const parse = <T>(s: string | null): T | null => (s === null ? null : (JSON.parse(s) as T));

/** Two records hold the same details (ignoring the bookkeeping times). */
function sameDetails(a: AnyRecord, b: AnyRecord) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of ['created_at', 'updated_at']) keys.delete(k);
  for (const k of keys) if (JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null)) return false;
  return true;
}

/**
 * Everything the phone keeps for one account: the records, the changes waiting to be sent, conflicts that
 * need the patient's decision, and changes the server refused. All writes go through one queue so two
 * of them never interleave.
 */
export class LocalStore {
  private tail: Promise<unknown> = Promise.resolve();
  private dataListeners = new Set<() => void>();
  private localListeners = new Set<() => void>();
  private newId: () => string;
  private now: () => string;

  private constructor(private db: Db, opts: StoreOptions) {
    this.newId = opts.newId ?? (() => globalThis.crypto.randomUUID());
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  static async open(db: Db, opts: StoreOptions = {}) {
    await migrate(db);
    const store = new LocalStore(db, opts);
    await store.recover();
    return store;
  }

  close() {
    return this.db.close();
  }

  // ---- plumbing ---------------------------------------------------------------------------------

  /** Called after anything stored here changes (including what a sync brings in). Screens reload on it. */
  onData(fn: () => void) {
    this.dataListeners.add(fn);
    return () => void this.dataListeners.delete(fn);
  }
  /** Called after the patient's own change (not a sync's): time to send it. */
  onLocalChange(fn: () => void) {
    this.localListeners.add(fn);
    return () => void this.localListeners.delete(fn);
  }
  private announce(local: boolean) {
    this.dataListeners.forEach((fn) => fn());
    if (local) this.localListeners.forEach((fn) => fn());
  }

  private exclusive<T>(fn: () => Promise<T>, tx: boolean): Promise<T> {
    const run = this.tail.then(() => (tx ? this.db.transaction(fn) : fn()));
    this.tail = run.catch(() => undefined);
    return run;
  }
  private write<T>(fn: () => Promise<T>, local = false) {
    return this.exclusive(fn, true).then((v) => {
      this.announce(local);
      return v;
    });
  }
  private read<T>(fn: () => Promise<T>) {
    return this.exclusive(fn, false);
  }

  /** A crash or a closed app can leave changes marked "being sent". They were not confirmed, so send them again. */
  private recover() {
    return this.write(async () => {
      await this.db.run('UPDATE queue SET sending = 0 WHERE sending = 1');
      await this.mergeChained();
    });
  }

  // ---- meta ---------------------------------------------------------------------------------------

  getMeta(key: string) {
    return this.read(async () => (await this.db.first<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]))?.value ?? null);
  }
  setMeta(key: string, value: string) {
    return this.write(() => this.putMeta(key, value));
  }
  private putMeta(key: string, value: string) {
    return this.db.run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
  }

  // ---- reading ------------------------------------------------------------------------------------

  list<T = AnyRecord>(type: RecordType): Promise<T[]> {
    return this.read(async () => {
      const rows = await this.db.all<RecordRow>('SELECT json FROM records WHERE type = ?', [type]);
      return rows.map((r) => JSON.parse(r.json) as AnyRecord).sort(compareRecords(type)) as T[];
    });
  }

  get<T = AnyRecord>(type: RecordType, id: string): Promise<T | null> {
    return this.read(async () => {
      const row = await this.db.first<RecordRow>('SELECT json FROM records WHERE type = ? AND id = ?', [type, id]);
      return row ? (JSON.parse(row.json) as T) : null;
    });
  }

  counts(): Promise<Record<RecordType, number>> {
    return this.read(async () => {
      const out = { allergies: 0, conditions: 0, visits: 0, medications: 0, lab_results: 0, documents: 0 } as Record<RecordType, number>;
      for (const r of await this.db.all<{ type: RecordType; n: number }>('SELECT type, COUNT(*) AS n FROM records GROUP BY type')) out[r.type] = r.n;
      return out;
    });
  }

  /** How many changes are waiting to be sent, and how many need the patient's attention. */
  status() {
    return this.read(async () => {
      const q = await this.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM queue');
      const c = await this.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM conflicts');
      const r = await this.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM rejected');
      return {
        waiting: q?.n ?? 0,
        conflicts: c?.n ?? 0,
        rejected: r?.n ?? 0,
        cursor: Number((await this.db.first<{ value: string }>("SELECT value FROM meta WHERE key = 'cursor'"))?.value ?? 0),
        lastSync: (await this.db.first<{ value: string }>("SELECT value FROM meta WHERE key = 'last_sync'"))?.value ?? null,
      };
    });
  }

  /** Whether this record has a change waiting or an unresolved conflict. */
  isPending(type: RecordType, id: string) {
    return this.read(async () => {
      const row = await this.db.first<{ pending: number }>('SELECT pending FROM records WHERE type = ? AND id = ?', [type, id]);
      return (row?.pending ?? 0) === 1;
    });
  }

  conflicts(): Promise<Conflict[]> {
    return this.read(async () => {
      const rows = await this.db.all<ConflictRow>('SELECT * FROM conflicts ORDER BY created_at');
      const out: Conflict[] = [];
      for (const c of rows) {
        const local = await this.db.first<RecordRow>('SELECT json FROM records WHERE type = ? AND id = ?', [c.type, c.id]);
        out.push({
          type: c.type,
          id: c.id,
          op: c.op,
          mine: local ? (JSON.parse(local.json) as AnyRecord) : null,
          theirs: JSON.parse(c.server_record) as AnyRecord,
          serverVersion: c.server_version,
          createdAt: c.created_at,
        });
      }
      return out;
    });
  }

  rejected(): Promise<Rejected[]> {
    return this.read(async () => {
      const rows = await this.db.all<RejectedRow>('SELECT * FROM rejected ORDER BY seq');
      return rows.map((r) => ({
        seq: r.seq, type: r.type, id: r.id, op: r.op, code: r.code, message: r.message,
        data: parse<Record<string, unknown>>(r.data), createdAt: r.created_at,
      }));
    });
  }

  dismissRejected(seq: number) {
    return this.write(() => this.db.run('DELETE FROM rejected WHERE seq = ?', [seq]));
  }

  // ---- the patient's own changes -------------------------------------------------------------------

  create(type: WritableType, input: Record<string, unknown>, id = this.newId()): Promise<AnyRecord> {
    return this.write(async () => {
      return this.createIn(type, id, input);
    }, true);
  }

  private async createIn(type: WritableType, id: string, input: Record<string, unknown>) {
    const record = buildRecord(type, id, input, this.now());
    await this.putRecord(type, id, record, null, 0, 1);
    await this.insertQueue(type, id, 'create', null, input, 0);
    return record;
  }

  /** Several new records saved together, all or none (a visit with what came out of it). `make` gets the new ids so records can point to one another. */
  createMany(make: (ids: string[]) => { type: WritableType; input: Record<string, unknown> }[], count: number): Promise<AnyRecord[]> {
    return this.write(async () => {
      const ids = Array.from({ length: count }, () => this.newId());
      const out: AnyRecord[] = [];
      for (const [i, item] of make(ids).entries()) out.push(await this.createIn(item.type, ids[i], item.input));
      return out;
    }, true);
  }

  update(type: WritableType, id: string, input: Record<string, unknown>): Promise<AnyRecord> {
    return this.write(async () => {
      const row = await this.recordRow(type, id);
      if (!row) throw new Error('This record is no longer on the phone.');
      const existing = JSON.parse(row.json) as AnyRecord;
      if (existing.entered_by) throw new Error('A doctor entered this record, so it cannot be edited. You can remove it.');
      const record = buildRecord(type, id, input, this.now(), existing);
      await this.putRecord(type, id, record, row.base_json ? (JSON.parse(row.base_json) as AnyRecord) : null, row.version, 1);

      const conflict = await this.db.first<ConflictRow>('SELECT * FROM conflicts WHERE type = ? AND id = ?', [type, id]);
      if (conflict) {
        // Still waiting for the patient's decision: "Keep mine" will send the newest version.
        await this.db.run('UPDATE conflicts SET data = ? WHERE type = ? AND id = ?', [JSON.stringify(input), type, id]);
        return record;
      }
      await this.queueChange(type, id, 'update', row.version, input, null);
      return record;
    }, true);
  }

  remove(type: WritableType, id: string): Promise<void> {
    return this.write(async () => {
      const row = await this.recordRow(type, id);
      if (!row) return;
      await this.db.run('DELETE FROM records WHERE type = ? AND id = ?', [type, id]);
      if (type === 'visits') await this.unlinkChildren(id);

      const conflict = await this.db.first<ConflictRow>('SELECT * FROM conflicts WHERE type = ? AND id = ?', [type, id]);
      if (conflict) {
        await this.db.run("UPDATE conflicts SET op = 'delete', data = NULL WHERE type = ? AND id = ?", [type, id]);
        return;
      }
      // The record's text is kept with the change, so a refused delete can put it back.
      await this.queueChange(type, id, 'delete', row.version, null, row.json);
    }, true);
  }

  /** A record the server holds that was changed online outside a sync (a document's details), kept on the phone as the server has it. */
  putServerRecord(type: RecordType, record: AnyRecord): Promise<void> {
    return this.write(async () => {
      const id = String(record[ID_KEY[type]]);
      const row = await this.recordRow(type, id);
      await this.putRecord(type, id, record, record, row?.version ?? 0, 0);
    });
  }

  /** Forgets a record here only (it was removed on the server directly). */
  dropLocal(type: RecordType, id: string): Promise<void> {
    return this.write(() => this.db.run('DELETE FROM records WHERE type = ? AND id = ?', [type, id]));
  }

  /** Records of a deleted visit are no longer linked to it (the server does the same). */
  private async unlinkChildren(visitId: string) {
    for (const t of ['conditions', 'medications', 'lab_results', 'documents'] as const) {
      const rows = await this.db.all<RecordRow>('SELECT * FROM records WHERE type = ?', [t]);
      for (const r of rows) {
        const rec = JSON.parse(r.json) as AnyRecord;
        if (rec.visit_id !== visitId) continue;
        const base = r.base_json ? (JSON.parse(r.base_json) as AnyRecord) : null;
        await this.db.run('UPDATE records SET json = ?, base_json = ? WHERE type = ? AND id = ?', [
          JSON.stringify({ ...rec, visit_id: null }),
          base && base.visit_id === visitId ? JSON.stringify({ ...base, visit_id: null }) : r.base_json,
          t,
          r.id,
        ]);
      }
    }
  }

  // ---- the queue ----------------------------------------------------------------------------------

  private async recordRow(type: RecordType, id: string) {
    return this.db.first<RecordRow>('SELECT * FROM records WHERE type = ? AND id = ?', [type, id]);
  }

  private async putRecord(type: RecordType, id: string, record: AnyRecord, base: AnyRecord | null, version: number, pending: number) {
    await this.db.run(
      `INSERT INTO records (type, id, json, base_json, version, pending) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(type, id) DO UPDATE SET json = excluded.json, base_json = excluded.base_json, version = excluded.version, pending = excluded.pending`,
      [type, id, JSON.stringify(record), base ? JSON.stringify(base) : null, version, pending],
    );
  }

  private async insertQueue(type: WritableType, id: string, op: Op, base: number | null, input: Record<string, unknown> | null, chained: number, rawData?: string | null) {
    await this.db.run(
      'INSERT INTO queue (type, id, op, base_version, data, sending, chained, attempts, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?)',
      [type, id, op, base, rawData ?? (input ? JSON.stringify(input) : null), chained, this.now()],
    );
  }

  /**
   * Adds a change, folding it into the one already waiting for the same record:
   * create+edit = create with the new details; create+delete = nothing; edit+edit = one edit (from the
   * first base); edit+delete = delete. If the earlier change is being sent right now it cannot be altered,
   * so the new one waits behind it and takes the version the server gives back.
   */
  private async queueChange(type: WritableType, id: string, op: 'update' | 'delete', base: number, input: Record<string, unknown> | null, rawData: string | null) {
    const last = await this.db.first<QueueRow>('SELECT * FROM queue WHERE type = ? AND id = ? ORDER BY seq DESC LIMIT 1', [type, id]);
    if (last?.sending) {
      await this.insertQueue(type, id, op, null, input, 1, rawData);
      return;
    }
    if (!last) {
      await this.insertQueue(type, id, op, base, input, 0, rawData);
      return;
    }
    await this.fold(last, op, input, rawData);
  }

  private async fold(last: QueueRow, op: 'update' | 'delete', input: Record<string, unknown> | null, rawData: string | null) {
    if (op === 'update') {
      await this.db.run('UPDATE queue SET data = ? WHERE seq = ?', [JSON.stringify(input), last.seq]);
    } else if (last.op === 'create') {
      await this.db.run('DELETE FROM queue WHERE seq = ?', [last.seq]);
    } else {
      await this.db.run("UPDATE queue SET op = 'delete', data = ? WHERE seq = ?", [rawData, last.seq]);
    }
  }

  /** Changes that waited behind one being sent are folded in once nothing is being sent for that record. */
  private async mergeChained() {
    const waiting = await this.db.all<QueueRow>('SELECT * FROM queue WHERE chained = 1 ORDER BY seq');
    for (const c of waiting) {
      const prev = await this.db.first<QueueRow>('SELECT * FROM queue WHERE type = ? AND id = ? AND seq < ? ORDER BY seq DESC LIMIT 1', [c.type, c.id, c.seq]);
      if (prev?.sending) continue;
      if (prev) {
        await this.db.run('DELETE FROM queue WHERE seq = ?', [c.seq]);
        await this.fold(prev, c.op as 'update' | 'delete', parse(c.data), c.op === 'delete' ? c.data : null);
      } else {
        await this.db.run('UPDATE queue SET chained = 0 WHERE seq = ?', [c.seq]);
      }
    }
  }

  // ---- conflicts ----------------------------------------------------------------------------------

  /** The patient's decision: keep their own version ("mine") or take the server's ("theirs"). */
  resolveConflict(type: WritableType, id: string, choice: 'mine' | 'theirs'): Promise<void> {
    return this.write(async () => {
      const c = await this.db.first<ConflictRow>('SELECT * FROM conflicts WHERE type = ? AND id = ?', [type, id]);
      if (!c) return;
      const theirs = JSON.parse(c.server_record) as AnyRecord;
      await this.db.run('DELETE FROM conflicts WHERE type = ? AND id = ?', [type, id]);
      if (choice === 'theirs') {
        await this.putRecord(type, id, theirs, theirs, c.server_version, 0);
        return;
      }
      if (c.op === 'delete') {
        await this.insertQueue(type, id, 'delete', c.server_version, null, 0, JSON.stringify(theirs));
        return;
      }
      const row = await this.recordRow(type, id);
      const mine = row ? (JSON.parse(row.json) as AnyRecord) : theirs;
      await this.putRecord(type, id, mine, theirs, c.server_version, 1);
      await this.insertQueue(type, id, 'update', c.server_version, parse(c.data), 0);
    }, true);
  }

  // ---- syncing ------------------------------------------------------------------------------------

  /** The next batch of changes to send. They are marked as being sent until the answer comes back. */
  takeBatch(max = 200): Promise<QueueRow[]> {
    return this.write(async () => {
      await this.mergeChained();
      const rows = await this.db.all<QueueRow>('SELECT * FROM queue WHERE chained = 0 AND sending = 0 ORDER BY seq LIMIT ?', [max]);
      for (const r of rows) await this.db.run('UPDATE queue SET sending = 1 WHERE seq = ?', [r.seq]);
      return rows;
    });
  }

  /** The send failed before an answer: put the batch back to be sent next time. */
  returnBatch(rows: QueueRow[]) {
    return this.write(async () => {
      for (const r of rows) await this.db.run('UPDATE queue SET sending = 0 WHERE seq = ?', [r.seq]);
      await this.mergeChained();
    });
  }

  /** Applies the server's answer to a batch from takeBatch. Returns what happened. */
  applyResponse(rows: QueueRow[], res: SyncResponse) {
    return this.write(async () => {
      const out = { applied: 0, conflicts: 0, rejected: 0, retry: 0 };
      if (res.reset) await this.wipeForReset();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const r = res.results[i];
        const chained = await this.db.all<QueueRow>('SELECT * FROM queue WHERE type = ? AND id = ? AND chained = 1 AND seq > ? ORDER BY seq', [row.type, row.id, row.seq]);
        if (!r) {
          await this.db.run('UPDATE queue SET sending = 0 WHERE seq = ?', [row.seq]);
          out.retry++;
          continue;
        }
        if (r.status === 'rejected' && r.code === 'server_error') {
          await this.db.run('UPDATE queue SET sending = 0, attempts = attempts + 1 WHERE seq = ?', [row.seq]);
          out.retry++;
          continue;
        }
        await this.db.run('DELETE FROM queue WHERE seq = ?', [row.seq]);

        let status = r.status;
        let record = r.record;
        let version = r.version;
        if (status === 'conflict') {
          // Often just our own change that arrived earlier and whose answer was lost: nothing to decide.
          const local = await this.recordRow(row.type, row.id);
          if (row.op === 'update' && local && r.server_record && sameDetails(JSON.parse(local.json) as AnyRecord, r.server_record)) {
            status = 'applied';
            record = r.server_record;
            version = r.server_version;
          }
        }

        if (status === 'applied') {
          out.applied++;
          await this.applied(row, r.deleted === true, record, version ?? 0, chained);
        } else if (status === 'conflict') {
          out.conflicts++;
          await this.conflicted(row, r.server_record ?? {}, r.server_version ?? 0, chained);
        } else if (row.op === 'delete' && r.code === 'not_found') {
          out.applied++; // already gone on the server
          await this.dropChained(chained);
        } else {
          out.rejected++;
          await this.refused(row, r.code ?? 'invalid', r.message ?? 'This change could not be saved.', chained);
        }
      }
      return out;
    });
  }

  private async dropChained(chained: QueueRow[]) {
    for (const c of chained) await this.db.run('DELETE FROM queue WHERE seq = ?', [c.seq]);
  }

  private async applied(row: QueueRow, deleted: boolean, record: AnyRecord | undefined, version: number, chained: QueueRow[]) {
    if (row.op === 'delete') {
      await this.db.run('DELETE FROM records WHERE type = ? AND id = ?', [row.type, row.id]);
      await this.dropChained(chained);
      return;
    }
    if (deleted || !record) {
      // Created here, then deleted elsewhere before this arrived: it is gone.
      await this.db.run('DELETE FROM records WHERE type = ? AND id = ?', [row.type, row.id]);
      await this.dropChained(chained);
      return;
    }
    if (chained.length > 0) {
      // Edited again while this was on its way: the newer text stays, built on the version just created.
      const local = await this.recordRow(row.type, row.id);
      // (If the patient deleted it meanwhile, there is no local copy and the waiting delete does the rest.)
      if (local) await this.putRecord(row.type, row.id, JSON.parse(local.json) as AnyRecord, record, version, 1);
      for (const c of chained) await this.db.run('UPDATE queue SET base_version = ?, chained = 0 WHERE seq = ?', [version, c.seq]);
      return;
    }
    await this.putRecord(row.type, row.id, record, record, version, 0);
  }

  private async conflicted(row: QueueRow, theirs: AnyRecord, version: number, chained: QueueRow[]) {
    let op: 'update' | 'delete' = row.op === 'delete' ? 'delete' : 'update';
    let mineRaw = row.op === 'delete' ? null : row.data;
    for (const c of chained) {
      if (c.op === 'delete') { op = 'delete'; mineRaw = null; }
      else mineRaw = c.data;
      await this.db.run('DELETE FROM queue WHERE seq = ?', [c.seq]);
    }
    await this.db.run(
      `INSERT INTO conflicts (type, id, op, data, server_record, server_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(type, id) DO UPDATE SET op = excluded.op, data = excluded.data, server_record = excluded.server_record, server_version = excluded.server_version`,
      [row.type, row.id, op, mineRaw, JSON.stringify(theirs), version, this.now()],
    );
    await this.db.run('UPDATE records SET pending = 1 WHERE type = ? AND id = ?', [row.type, row.id]);
  }

  private async refused(row: QueueRow, code: string, message: string, chained: QueueRow[]) {
    await this.dropChained(chained);
    let kept: string | null = row.data;
    if (row.op === 'create') {
      await this.db.run('DELETE FROM records WHERE type = ? AND id = ?', [row.type, row.id]);
    } else if (row.op === 'update') {
      const local = await this.recordRow(row.type, row.id);
      if (local?.base_json) await this.putRecord(row.type, row.id, JSON.parse(local.base_json) as AnyRecord, JSON.parse(local.base_json) as AnyRecord, local.version, 0);
    } else if (row.data) {
      // A refused delete: the record comes back.
      const rec = JSON.parse(row.data) as AnyRecord;
      await this.putRecord(row.type, row.id, rec, rec, row.base_version ?? 0, 0);
      kept = null;
    }
    await this.db.run('INSERT INTO rejected (type, id, op, code, message, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [row.type, row.id, row.op, code, message, kept, this.now()]);
  }

  /** Brings in what changed on the server, then moves the cursor. */
  applyFeed(items: FeedItem[], cursor: number, profile: Record<string, unknown> | null) {
    return this.write(async () => {
      let pulled = 0;
      for (const it of items) {
        const row = await this.recordRow(it.type, it.id);
        const hasConflict = await this.db.first('SELECT 1 AS x FROM conflicts WHERE type = ? AND id = ?', [it.type, it.id]);
        const waiting = await this.db.first('SELECT 1 AS x FROM queue WHERE type = ? AND id = ?', [it.type, it.id]);
        // A record with a change of the patient's own waiting (including a delete, which has no local copy) is left alone:
        // that change is checked against the server when it is sent.
        if (row?.pending === 1 || hasConflict || waiting) continue;
        if (row && row.version >= it.version) continue;
        pulled++;
        if (it.deleted || !it.record) {
          await this.db.run('DELETE FROM records WHERE type = ? AND id = ?', [it.type, it.id]);
          continue;
        }
        await this.putRecord(it.type, it.id, it.record, it.record, it.version, 0);
      }
      await this.putMeta('cursor', String(cursor));
      await this.putMeta('last_sync', this.now());
      if (profile) await this.putMeta('profile', JSON.stringify(profile));
      return pulled;
    });
  }

  /** The server's data was reset: records fetched from it are dropped and downloaded again. Records created here and not sent yet are kept. */
  private async wipeForReset() {
    await this.db.run("DELETE FROM queue WHERE op != 'create'");
    await this.db.run('DELETE FROM conflicts');
    const keep = (await this.db.all<{ type: string; id: string }>("SELECT type, id FROM queue WHERE op = 'create'")).map((r) => `${r.type}:${r.id}`);
    const rows = await this.db.all<RecordRow>('SELECT type, id FROM records');
    for (const r of rows) if (!keep.includes(`${r.type}:${r.id}`)) await this.db.run('DELETE FROM records WHERE type = ? AND id = ?', [r.type, r.id]);
    await this.putMeta('cursor', '0');
  }

  /** Saved profile and settings (read by screens). */
  async profile<T = Record<string, unknown>>() {
    const raw = await this.getMeta('profile');
    return raw ? (JSON.parse(raw) as T) : null;
  }
}

export { ID_KEY };
export type { SqlValue };

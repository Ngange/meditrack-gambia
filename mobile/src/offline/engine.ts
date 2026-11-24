import type { LocalStore } from './store';
import type { QueueRow, SyncRequest, Transport } from './types';

export type SyncSummary = {
  /** Changes of the patient's that the server accepted. */
  sent: number;
  /** Records brought in or updated from the server. */
  received: number;
  /** New conflicts waiting for the patient's decision. */
  conflicts: number;
  /** Changes the server refused. */
  rejected: number;
};

const BATCH = 200;
const MAX_ROUNDS = 25;

const toRequest = (r: QueueRow): SyncRequest['changes'][number] => ({
  op: r.op,
  type: r.type,
  id: r.id,
  ...(r.op === 'create' ? {} : { baseVersion: r.base_version ?? 0 }),
  ...(r.op === 'delete' || !r.data ? {} : { data: JSON.parse(r.data) as Record<string, unknown> }),
});

/**
 * Sends the patient's waiting changes and brings in everything new from the server, as many rounds as
 * it takes. Only one sync runs at a time; asking again while one runs gives the same answer.
 * Errors from the transport (no connection, must sign in again) propagate after the waiting changes
 * have been put back safely, so nothing is lost.
 */
export class SyncEngine {
  private running: Promise<SyncSummary> | null = null;

  constructor(
    private store: LocalStore,
    private transport: Transport,
    private deviceId: () => string,
  ) {}

  syncNow(): Promise<SyncSummary> {
    if (!this.running) {
      this.running = this.run().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  get isRunning() {
    return this.running !== null;
  }

  private async run(): Promise<SyncSummary> {
    const total: SyncSummary = { sent: 0, received: 0, conflicts: 0, rejected: 0 };
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const rows = await this.store.takeBatch(BATCH);
      const status = await this.store.status();
      let res;
      try {
        res = await this.transport.sync({
          deviceId: this.deviceId(),
          cursor: status.cursor,
          changes: rows.map(toRequest),
        });
      } catch (err) {
        await this.store.returnBatch(rows);
        throw err;
      }
      const outcome = await this.store.applyResponse(rows, res);
      total.received += await this.store.applyFeed(res.changes, res.cursor, res.profile);
      total.sent += outcome.applied;
      total.conflicts += outcome.conflicts;
      total.rejected += outcome.rejected;

      // Another round: more to download, or more changes waiting that did get a verdict this time.
      const settled = outcome.applied + outcome.conflicts + outcome.rejected;
      const more = res.hasMore || (rows.length === BATCH && settled > 0) || (await this.moreWaiting(settled));
      if (!more) break;
    }
    return total;
  }

  /** Changes made while the last round was on its way. Retries (server errors) do not count, so we never spin. */
  private async moreWaiting(settled: number) {
    if (settled === 0) return false;
    return (await this.store.status()).waiting > 0;
  }
}

/** The kinds of record kept on the phone. Documents are download-only (their files stay on the server). */
export type RecordType = 'allergies' | 'conditions' | 'visits' | 'medications' | 'lab_results' | 'documents';
export type WritableType = Exclude<RecordType, 'documents'>;
export type Op = 'create' | 'update' | 'delete';

export const WRITABLE_TYPES: WritableType[] = ['allergies', 'conditions', 'visits', 'medications', 'lab_results'];

/** The id field of each record as the server sends it. */
export const ID_KEY: Record<RecordType, string> = {
  allergies: 'allergy_id',
  conditions: 'condition_id',
  visits: 'visit_id',
  medications: 'medication_id',
  lab_results: 'result_id',
  documents: 'document_id',
};

export type AnyRecord = Record<string, unknown> & { created_at?: string; updated_at?: string };

export type QueueRow = {
  seq: number;
  type: WritableType;
  id: string;
  op: Op;
  /** The version of the record this change was made from. null on a create, and on a change made while
   *  an earlier change to the same record was still being sent (it takes that change's new version). */
  base_version: number | null;
  data: string | null; // JSON of the request body (create/update)
  sending: number;
  chained: number;
  attempts: number;
  created_at: string;
};

export type ConflictRow = {
  type: WritableType;
  id: string;
  op: 'update' | 'delete';
  /** The patient's own version of the change (JSON body), kept so "Keep mine" can send it again. */
  data: string | null;
  server_record: string;
  server_version: number;
  created_at: string;
};

export type RejectedRow = {
  seq: number;
  type: WritableType;
  id: string;
  op: Op;
  code: string;
  message: string;
  data: string | null;
  created_at: string;
};

export type Conflict = {
  type: WritableType;
  id: string;
  op: 'update' | 'delete';
  mine: AnyRecord | null;
  theirs: AnyRecord;
  serverVersion: number;
  createdAt: string;
};

export type Rejected = {
  seq: number;
  type: WritableType;
  id: string;
  op: Op;
  code: string;
  message: string;
  data: Record<string, unknown> | null;
  createdAt: string;
};

/** What the server sends back for one sync (see docs/sync-api.md). */
export type SyncResult = {
  id: string;
  type: WritableType;
  op: Op;
  status: 'applied' | 'conflict' | 'rejected';
  version?: number;
  record?: AnyRecord;
  deleted?: boolean;
  restored?: boolean;
  reason?: string;
  server_record?: AnyRecord;
  server_version?: number;
  code?: string;
  message?: string;
};

export type FeedItem = { version: number; type: RecordType; id: string; deleted: boolean; record?: AnyRecord };

export type SyncResponse = {
  results: SyncResult[];
  changes: FeedItem[];
  cursor: number;
  hasMore: boolean;
  reset: boolean;
  profile: Record<string, unknown> | null;
  serverTime: string;
};

export type SyncRequest = {
  deviceId: string;
  cursor: number;
  changes: { op: Op; type: WritableType; id: string; baseVersion?: number; data?: Record<string, unknown> }[];
  limit?: number;
};

/** How the engine reaches the server. The app's real one lives in transport.ts; tests supply their own. */
export interface Transport {
  /** Sends one sync. Throws SyncNetworkError when the server cannot be reached, SyncAuthError when the phone
   *  must sign in again, and any other Error for a server failure. */
  sync(req: SyncRequest): Promise<SyncResponse>;
}

export class SyncNetworkError extends Error {
  constructor(message = 'Unable to reach the server.') {
    super(message);
    this.name = 'SyncNetworkError';
  }
}

/** The phone has no valid login any more (device key refused, token rejected). Local data stays. */
export class SyncAuthError extends Error {
  constructor(message = 'Sign in again to sync.') {
    super(message);
    this.name = 'SyncAuthError';
  }
}

import type { z } from 'zod';

import { recordFindCursorSchema, recordFindOptionsSchema } from './schema.js';
import { baseRecordSchema } from './schema.js';

/**
 * Backend-neutral record metadata shared by every application record.
 */
export type BaseRecord = z.infer<typeof baseRecordSchema>;

/**
 * BaseRecord fields owned by policy and excluded from caller payloads.
 */
export type RecordProtectedKeys = keyof Omit<BaseRecord, 'status'>;

/**
 * Create payload before policy-owned metadata is applied.
 */
export type RecordCreateInput<T extends BaseRecord> = Omit<T, RecordProtectedKeys>;

/**
 * Allowed partial update payload with record-owned fields forbidden.
 *
 * Optional `never` fields preserve compatibility with `ICrud.update`
 * while rejecting protected keys at compile time.
 */
export type RecordChanges<T extends BaseRecord> = Partial<T> & {
  [K in RecordProtectedKeys]?: never;
};

/**
 * Cursor fields used by tenant-scoped record collection pagination.
 */
export type RecordFindCursor = z.infer<typeof recordFindCursorSchema>;

/**
 * BaseRecord collection find options owned by the policy layer.
 */
export type RecordFindOptions = z.infer<typeof recordFindOptionsSchema>;

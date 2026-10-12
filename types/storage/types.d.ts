import type { z } from 'zod';
import { recordFindCursorSchema, recordFindOptionsSchema } from './schema.js';
import { baseRecordSchema } from './schema.js';
/**
 * Backend-neutral record metadata shared by every application record.
 * @remarks
 * Inferred from {@link baseRecordSchema}, which carries the field-level documentation.
 * Concrete record types intersect their domain fields with this base so identity, tenancy,
 * and audit metadata stay uniform across handlers.
 * @group Storage
 * @category Storage
 */
export type BaseRecord = z.infer<typeof baseRecordSchema>;
/**
 * BaseRecord fields owned by policy and excluded from caller payloads.
 * @remarks
 * Everything except `status`; these keys are stamped by {@link RecordsHandler} from the
 * execution context, so callers may neither set them on create nor change them on update.
 * @group Storage
 * @category Storage
 */
export type RecordProtectedKeys = keyof Omit<BaseRecord, 'status'>;
/**
 * Create payload before policy-owned metadata is applied.
 * @remarks
 * The caller supplies only domain fields; {@link RecordsHandler.create} adds the
 * {@link RecordProtectedKeys} before persistence.
 * @group Storage
 * @category Storage
 * @template T - Concrete record type extending {@link BaseRecord}.
 */
export type RecordCreateInput<T extends BaseRecord> = Omit<T, RecordProtectedKeys>;
/**
 * Allowed partial update payload with record-owned fields forbidden.
 * @remarks
 * Optional `never` fields preserve compatibility with `ICrud.update` while rejecting the
 * {@link RecordProtectedKeys} at compile time, so audit and identity metadata can never be
 * overwritten through an update.
 * @group Storage
 * @category Storage
 * @template T - Concrete record type extending {@link BaseRecord}.
 */
export type RecordChanges<T extends BaseRecord> = Partial<T> & {
    [K in RecordProtectedKeys]?: never;
};
/**
 * Cursor fields used by tenant-scoped record collection pagination.
 * @remarks
 * Inferred from {@link recordFindCursorSchema}; captures the last row's sort key so the next
 * page resumes deterministically under the `createdAt`/`recordId` ordering.
 * @group Storage
 * @category Storage
 */
export type RecordFindCursor = z.infer<typeof recordFindCursorSchema>;
/**
 * BaseRecord collection find options owned by the policy layer.
 * @remarks
 * Inferred from {@link recordFindOptionsSchema}; the policy-layer counterpart to the backend
 * `FindOptions`, exposing only the cursor and page size while the ordering stays fixed.
 * @group Storage
 * @category Storage
 */
export type RecordFindOptions = z.infer<typeof recordFindOptionsSchema>;
//# sourceMappingURL=types.d.ts.map
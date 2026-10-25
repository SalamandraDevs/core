import { z } from 'zod';

/**
 * Shared Zod schema for backend-neutral record metadata.
 *
 * - TenantId: Tenant boundary used to scope every record operation.
 * - RecordId: Stable unique identifier for the record.
 * - HandlerName: Records handler that owns the record shape and policy.
 * - Status: Domain lifecycle state for the record.
 * - CreatedAt: Creation timestamp assigned by record policy.
 * - CreatedBy: Actor recorded as the record creator.
 * - UpdatedAt: Last update timestamp assigned by record policy.
 * - UpdatedBy: Actor recorded as the last updater.
 *
 * @remarks
 * The runtime source of truth for {@link BaseRecord}; `.strict()` rejects unknown keys so
 * stored documents cannot carry fields outside this contract.
 * @group Storage
 * @category Storage
 */
export const baseRecordSchema = z
  .object({
    tenantId: z.string().min(1),
    recordId: z.uuid(),
    handlerName: z.string().min(1),
    status: z.string().min(1),
    createdAt: z.date(),
    createdBy: z.string().min(1),
    updatedAt: z.date(),
    updatedBy: z.string().min(1)
  })
  .strict();

/**
 * Cursor schema used by tenant-scoped record collection pagination.
 *
 * - CreatedAt: Last returned creation timestamp in the current page.
 * - RecordId: Last returned record identifier used as the timestamp tie-breaker.
 *
 * @remarks
 * Runtime source of truth for {@link RecordFindCursor}. `createdAt` is coerced so a
 * serialized (non-ISO) cursor string round-trips back into a `Date`.
 * @group Storage
 * @category Storage
 */
export const recordFindCursorSchema = z
  .object({
    createdAt: z.coerce.date(), // INFO: coerce accept non-iso string dates.
    recordId: z.uuid()
  })
  .strict();

/**
 * Shared Zod schema for record collection find options.
 *
 * - Cursor: Continuation point from the previous record page, or null for the first page.
 * - Limit: Maximum records returned to the caller.
 *
 * @remarks
 * Runtime source of truth for {@link RecordFindOptions}; `limit` must be a positive integer
 * and a `null` cursor requests the first page.
 * @group Storage
 * @category Storage
 */
export const recordFindOptionsSchema = z
  .object({
    cursor: recordFindCursorSchema.nullable(),
    limit: z.number().int().positive()
  })
  .strict();

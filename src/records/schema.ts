import { z } from 'zod';

/**
 * Shared Zod schema for backend-neutral record metadata.
 * - tenantId: Tenant boundary used to scope every record operation.
 * - recordId: Stable unique identifier for the record.
 * - handlerName: Records handler that owns the record shape and policy.
 * - status: Domain lifecycle state for the record.
 * - createdAt: Creation timestamp assigned by record policy.
 * - createdBy: Actor recorded as the record creator.
 * - updatedAt: Last update timestamp assigned by record policy.
 * - updatedBy: Actor recorded as the last updater.
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
 * - createdAt: Last returned creation timestamp in the current page.
 * - recordId: Last returned record identifier used as the timestamp tie-breaker.
 */
export const recordFindCursorSchema = z
  .object({
    createdAt: z.coerce.date(), // INFO: coerce accept non-iso string dates.
    recordId: z.uuid()
  })
  .strict();

/**
 * Shared Zod schema for record collection find options.
 * - cursor: Continuation point from the previous record page, or null for the first page.
 * - limit: Maximum records returned to the caller.
 */
export const recordFindOptionsSchema = z
  .object({
    cursor: recordFindCursorSchema.nullable(),
    limit: z.number().int().positive()
  })
  .strict();

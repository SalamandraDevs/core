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
export declare const baseRecordSchema: z.ZodObject<{
    tenantId: z.ZodString;
    recordId: z.ZodUUID;
    handlerName: z.ZodString;
    status: z.ZodString;
    createdAt: z.ZodDate;
    createdBy: z.ZodString;
    updatedAt: z.ZodDate;
    updatedBy: z.ZodString;
}, z.core.$strict>;
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
export declare const recordFindCursorSchema: z.ZodObject<{
    createdAt: z.ZodCoercedDate<unknown>;
    recordId: z.ZodUUID;
}, z.core.$strict>;
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
export declare const recordFindOptionsSchema: z.ZodObject<{
    cursor: z.ZodNullable<z.ZodObject<{
        createdAt: z.ZodCoercedDate<unknown>;
        recordId: z.ZodUUID;
    }, z.core.$strict>>;
    limit: z.ZodNumber;
}, z.core.$strict>;
//# sourceMappingURL=schema.d.ts.map
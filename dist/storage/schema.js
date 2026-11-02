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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0b3JhZ2Uvc2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxLQUFLLENBQUM7QUFFeEI7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBaUJHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQztLQUM5QixNQUFNLENBQUM7SUFDTixRQUFRLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDM0IsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUU7SUFDbEIsV0FBVyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzlCLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN6QixTQUFTLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRTtJQUNuQixTQUFTLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDNUIsU0FBUyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUU7SUFDbkIsU0FBUyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0NBQzdCLENBQUM7S0FDRCxNQUFNLEVBQUUsQ0FBQztBQUVaOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQztLQUNwQyxNQUFNLENBQUM7SUFDTixTQUFTLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSw0Q0FBNEM7SUFDeEUsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUU7Q0FDbkIsQ0FBQztLQUNELE1BQU0sRUFBRSxDQUFDO0FBRVo7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxDQUFDO0tBQ3JDLE1BQU0sQ0FBQztJQUNOLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQyxRQUFRLEVBQUU7SUFDekMsS0FBSyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDbkMsQ0FBQztLQUNELE1BQU0sRUFBRSxDQUFDIn0=
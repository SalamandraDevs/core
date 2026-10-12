import { randomUUID } from 'node:crypto';
import { getExecutionCtx } from '../utils/context.js';
/**
 * Base record handler that applies tenant scope and delegates persistence to an
 * {@link ICrud} adapter.
 * @remarks
 * Concrete handlers subclass this to expose a typed storage surface for one record shape.
 * Every operation derives the tenant (and, for writes, the actor) from the ambient
 * {@link ExecutionContext}, so callers never pass a tenant explicitly and cross-tenant
 * access is structurally prevented. Because each operation reads that context, every method
 * propagates the {@link getExecutionCtx} failure when no context is bound.
 * @group Storage
 * @category Storage
 * @template T - Concrete record type extending {@link BaseRecord}.
 */
export class RecordsHandler {
    crud;
    handlerName;
    /**
     * Creates a record handler bound to one CRUD adapter.
     * @param crud - Backend-neutral persistence contract for the record.
     * @param handlerName - Stored handler discriminator applied to created records.
     */
    constructor(crud, handlerName) {
        this.crud = crud;
        this.handlerName = handlerName;
    }
    /**
     * Creates a new record for the current execution context tenant.
     * @remarks
     * Stamps the policy-owned metadata the caller must not supply: a fresh `recordId`, the
     * handler discriminator, the tenant and actor from the execution context, and matching
     * created/updated timestamps.
     * @param record - BaseRecord input without policy-owned metadata.
     * @returns The created record.
     * @throws {CustomError} RESOURCE_NOT_FOUND when no execution context is bound.
     */
    create(record) {
        const { authenticated } = getExecutionCtx();
        const now = new Date();
        return this.crud.create({
            ...record,
            handlerName: this.handlerName,
            tenantId: authenticated.tenantId,
            recordId: randomUUID(),
            createdAt: now,
            createdBy: authenticated.actorId,
            updatedAt: now,
            updatedBy: authenticated.actorId
        });
    }
    /**
     * Reads one active record by its public identifier within the current tenant.
     * @param recordId - BaseRecord identifier (`recordId`).
     * @returns The matching record, or `null` when none exists for the tenant.
     * @throws {CustomError} RESOURCE_NOT_FOUND when no execution context is bound.
     */
    read(recordId) {
        const { tenantId } = getExecutionCtx().authenticated;
        const criteria = {
            recordId,
            tenantId
        };
        return this.crud.read(criteria);
    }
    /**
     * Updates one active record by its public identifier within the current tenant.
     * @remarks
     * Refreshes `updatedAt` and `updatedBy` from the current context, so audit metadata
     * cannot be spoofed through the `changes` payload.
     * @param recordId - BaseRecord identifier (`recordId`).
     * @param changes - Allowed field changes for the record; protected keys are rejected at
     *   compile time.
     * @returns The updated record, or `null` when none exists for the tenant.
     * @throws {CustomError} RESOURCE_NOT_FOUND when no execution context is bound.
     */
    update(recordId, changes) {
        const { actorId, tenantId } = getExecutionCtx().authenticated;
        const criteria = {
            recordId,
            tenantId
        };
        return this.crud.update(criteria, {
            ...changes,
            updatedAt: new Date(),
            updatedBy: actorId
        });
    }
    /**
     * Physically deletes one record by its public identifier within the current tenant.
     * @remarks
     * A hard delete, not a status change. The public method accepts only `recordId`; the
     * tenant identifier is derived from the execution context and combined with it, so a
     * record from another tenant can never be targeted.
     * @param recordId - BaseRecord identifier (`recordId`).
     * @returns The deleted record, or `null` when none exists for the tenant.
     * @throws {CustomError} RESOURCE_NOT_FOUND when no execution context is bound.
     */
    delete(recordId) {
        const { tenantId } = getExecutionCtx().authenticated;
        const criteria = {
            recordId,
            tenantId
        };
        return this.crud.delete(criteria);
    }
    /**
     * Finds active records within the current tenant.
     * @remarks
     * Results are ordered by `createdAt` descending with `recordId` as a stable tie-breaker,
     * which matches the `tenant_record` index and gives keyset pagination a deterministic
     * order. The tenant filter is always applied, so the caller's `criteria` can only narrow
     * within the tenant, never across tenants.
     * @param criteria - Optional record fields and values used to filter the records.
     * @param options - Required cursor and page-size controls.
     * @returns The matching page of records with its continuation cursor.
     * @throws {CustomError} RESOURCE_NOT_FOUND when no execution context is bound.
     */
    find(criteria = {}, options) {
        const { tenantId } = getExecutionCtx().authenticated;
        const findOrder = [
            { field: 'createdAt', direction: 'desc' },
            { field: 'recordId', direction: 'desc' }
        ];
        const findOptions = {
            cursor: options.cursor,
            limit: options.limit,
            orderBy: findOrder
        };
        return this.crud.find({ ...criteria, tenantId }, findOptions);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb3Jkcy1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0b3JhZ2UvcmVjb3Jkcy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBTXREOzs7Ozs7Ozs7Ozs7R0FZRztBQUNILE1BQU0sT0FBZ0IsY0FBYztJQU9iO0lBQ0Y7SUFQbkI7Ozs7T0FJRztJQUNILFlBQ3FCLElBQWMsRUFDaEIsV0FBNkI7UUFEM0IsU0FBSSxHQUFKLElBQUksQ0FBVTtRQUNoQixnQkFBVyxHQUFYLFdBQVcsQ0FBa0I7SUFDN0MsQ0FBQztJQUVKOzs7Ozs7Ozs7T0FTRztJQUNILE1BQU0sQ0FBQyxNQUE0QjtRQUNqQyxNQUFNLEVBQUUsYUFBYSxFQUFFLEdBQUcsZUFBZSxFQUFFLENBQUM7UUFDNUMsTUFBTSxHQUFHLEdBQVMsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUU3QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3RCLEdBQUcsTUFBTTtZQUNULFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixRQUFRLEVBQUUsYUFBYSxDQUFDLFFBQVE7WUFDaEMsUUFBUSxFQUFFLFVBQVUsRUFBRTtZQUN0QixTQUFTLEVBQUUsR0FBRztZQUNkLFNBQVMsRUFBRSxhQUFhLENBQUMsT0FBTztZQUNoQyxTQUFTLEVBQUUsR0FBRztZQUNkLFNBQVMsRUFBRSxhQUFhLENBQUMsT0FBTztTQUM1QixDQUFDLENBQUM7SUFDVixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxJQUFJLENBQUMsUUFBZ0I7UUFDbkIsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLGVBQWUsRUFBRSxDQUFDLGFBQWEsQ0FBQztRQUVyRCxNQUFNLFFBQVEsR0FBZTtZQUMzQixRQUFRO1lBQ1IsUUFBUTtTQUNLLENBQUM7UUFFaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNILE1BQU0sQ0FBQyxRQUFnQixFQUFFLE9BQXlCO1FBQ2hELE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsZUFBZSxFQUFFLENBQUMsYUFBYSxDQUFDO1FBRTlELE1BQU0sUUFBUSxHQUFlO1lBQzNCLFFBQVE7WUFDUixRQUFRO1NBQ0ssQ0FBQztRQUVoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTtZQUNoQyxHQUFHLE9BQU87WUFDVixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDckIsU0FBUyxFQUFFLE9BQU87U0FDbkIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNILE1BQU0sQ0FBQyxRQUFnQjtRQUNyQixNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsZUFBZSxFQUFFLENBQUMsYUFBYSxDQUFDO1FBRXJELE1BQU0sUUFBUSxHQUFlO1lBQzNCLFFBQVE7WUFDUixRQUFRO1NBQ0ssQ0FBQztRQUVoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7T0FXRztJQUNILElBQUksQ0FBQyxXQUF1QixFQUFFLEVBQUUsT0FBMEI7UUFDeEQsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLGVBQWUsRUFBRSxDQUFDLGFBQWEsQ0FBQztRQUVyRCxNQUFNLFNBQVMsR0FBeUI7WUFDdEMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUU7WUFDekMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUU7U0FDekMsQ0FBQztRQUVGLE1BQU0sV0FBVyxHQUFtQjtZQUNsQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQTJCO1lBQzNDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixPQUFPLEVBQUUsU0FBUztTQUNuQixDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7Q0FDRiJ9
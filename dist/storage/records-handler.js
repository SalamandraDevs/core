import { randomUUID } from 'node:crypto';
import { getExecutionCtx } from '../utils/context.js';
/**
 * Base record handler that applies tenant scope and delegates persistence to an
 * {@link ICrud} adapter.
 *
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
     *
     * @param crud - Backend-neutral persistence contract for the record.
     * @param handlerName - Stored handler discriminator applied to created records.
     */
    constructor(crud, handlerName) {
        this.crud = crud;
        this.handlerName = handlerName;
    }
    /**
     * Creates a new record for the current execution context tenant.
     *
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
     *
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
     *
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
     *
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
     *
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb3Jkcy1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0b3JhZ2UvcmVjb3Jkcy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBTXREOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxNQUFNLE9BQWdCLGNBQWM7SUFRYjtJQUNGO0lBUm5COzs7OztPQUtHO0lBQ0gsWUFDcUIsSUFBYyxFQUNoQixXQUE2QjtRQUQzQixTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ2hCLGdCQUFXLEdBQVgsV0FBVyxDQUFrQjtJQUM3QyxDQUFDO0lBRUo7Ozs7Ozs7Ozs7T0FVRztJQUNILE1BQU0sQ0FBQyxNQUE0QjtRQUNqQyxNQUFNLEVBQUUsYUFBYSxFQUFFLEdBQUcsZUFBZSxFQUFFLENBQUM7UUFDNUMsTUFBTSxHQUFHLEdBQVMsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUU3QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3RCLEdBQUcsTUFBTTtZQUNULFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixRQUFRLEVBQUUsYUFBYSxDQUFDLFFBQVE7WUFDaEMsUUFBUSxFQUFFLFVBQVUsRUFBRTtZQUN0QixTQUFTLEVBQUUsR0FBRztZQUNkLFNBQVMsRUFBRSxhQUFhLENBQUMsT0FBTztZQUNoQyxTQUFTLEVBQUUsR0FBRztZQUNkLFNBQVMsRUFBRSxhQUFhLENBQUMsT0FBTztTQUM1QixDQUFDLENBQUM7SUFDVixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsSUFBSSxDQUFDLFFBQWdCO1FBQ25CLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxlQUFlLEVBQUUsQ0FBQyxhQUFhLENBQUM7UUFFckQsTUFBTSxRQUFRLEdBQWU7WUFDM0IsUUFBUTtZQUNSLFFBQVE7U0FDSyxDQUFDO1FBRWhCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsTUFBTSxDQUFDLFFBQWdCLEVBQUUsT0FBeUI7UUFDaEQsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxlQUFlLEVBQUUsQ0FBQyxhQUFhLENBQUM7UUFFOUQsTUFBTSxRQUFRLEdBQWU7WUFDM0IsUUFBUTtZQUNSLFFBQVE7U0FDSyxDQUFDO1FBRWhCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ2hDLEdBQUcsT0FBTztZQUNWLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRTtZQUNyQixTQUFTLEVBQUUsT0FBTztTQUNuQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNILE1BQU0sQ0FBQyxRQUFnQjtRQUNyQixNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsZUFBZSxFQUFFLENBQUMsYUFBYSxDQUFDO1FBRXJELE1BQU0sUUFBUSxHQUFlO1lBQzNCLFFBQVE7WUFDUixRQUFRO1NBQ0ssQ0FBQztRQUVoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxJQUFJLENBQUMsV0FBdUIsRUFBRSxFQUFFLE9BQTBCO1FBQ3hELE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxlQUFlLEVBQUUsQ0FBQyxhQUFhLENBQUM7UUFFckQsTUFBTSxTQUFTLEdBQXlCO1lBQ3RDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFO1lBQ3pDLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFO1NBQ3pDLENBQUM7UUFFRixNQUFNLFdBQVcsR0FBbUI7WUFDbEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUEyQjtZQUMzQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDcEIsT0FBTyxFQUFFLFNBQVM7U0FDbkIsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNoRSxDQUFDO0NBQ0YifQ==
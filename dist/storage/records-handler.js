import { randomUUID } from 'node:crypto';
/**
 * Base record handler that applies tenant scope and delegates persistence to an
 * {@link ICrud} adapter.
 *
 * @remarks
 * Concrete handlers subclass this to expose a typed storage surface for one record shape.
 * Every operation derives the tenant (and, for writes, the actor) from the ambient
 * {@link ExecutionContext}, so callers never pass a tenant explicitly and cross-tenant
 * access is structurally prevented. Because each operation reads that context, every method
 * propagates the {@link IExecutionCtxProvider.get} failure when no context is bound.
 * @group Storage
 * @category Storage
 * @template T - Concrete record type extending {@link BaseRecord}.
 */
export class RecordsHandler {
    crud;
    executionCtx;
    handlerName;
    /**
     * Creates a record handler bound to one CRUD adapter and one execution context provider.
     *
     * @param crud - Backend-neutral persistence contract for the record.
     * @param executionCtx - Provider of the tenant and actor for the current request or job.
     * @param handlerName - Stored handler discriminator applied to created records.
     */
    constructor(crud, executionCtx, handlerName) {
        this.crud = crud;
        this.executionCtx = executionCtx;
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
     * @throws {CustomError} EXECUTION_CONTEXT_ERROR when no execution context is bound.
     */
    create(record) {
        const { authenticated } = this.executionCtx.get();
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
     * @throws {CustomError} EXECUTION_CONTEXT_ERROR when no execution context is bound.
     */
    read(recordId) {
        const { tenantId } = this.executionCtx.get().authenticated;
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
     * @throws {CustomError} EXECUTION_CONTEXT_ERROR when no execution context is bound.
     */
    update(recordId, changes) {
        const { actorId, tenantId } = this.executionCtx.get().authenticated;
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
     * @throws {CustomError} EXECUTION_CONTEXT_ERROR when no execution context is bound.
     */
    delete(recordId) {
        const { tenantId } = this.executionCtx.get().authenticated;
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
     * @throws {CustomError} EXECUTION_CONTEXT_ERROR when no execution context is bound.
     */
    find(criteria = {}, options) {
        const { tenantId } = this.executionCtx.get().authenticated;
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
    /**
     * Reads every record matching the criteria, across all tenants.
     *
     * @remarks
     * Unlike {@link RecordsHandler.find}, this applies no tenant filter and reads no execution
     * context, so it runs outside any request scope, such as at process startup or a
     * maintenance cron. Reserved for process-wide concerns that must observe every tenant's
     * records, such as rebuilding an in-memory revocation set; it must never be reached from
     * a user-facing route, where tenant isolation must hold. A numeric `options.limit` caps
     * the result and may truncate it, so pass `null` when the full set is required.
     * @param criteria - Record fields and values used to filter across all tenants.
     * @param options - Limit, optional order, and optional exclusive range bounds.
     * @returns Every matching record, across all tenants.
     */
    findAll(criteria, options) {
        return this.crud.findAll(criteria, options);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb3Jkcy1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0b3JhZ2UvcmVjb3Jkcy1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFTekM7Ozs7Ozs7Ozs7Ozs7R0FhRztBQUNILE1BQU0sT0FBZ0IsY0FBYztJQVNiO0lBQ0E7SUFDRjtJQVZuQjs7Ozs7O09BTUc7SUFDSCxZQUNxQixJQUFjLEVBQ2QsWUFBbUMsRUFDckMsV0FBNkI7UUFGM0IsU0FBSSxHQUFKLElBQUksQ0FBVTtRQUNkLGlCQUFZLEdBQVosWUFBWSxDQUF1QjtRQUNyQyxnQkFBVyxHQUFYLFdBQVcsQ0FBa0I7SUFDN0MsQ0FBQztJQUVKOzs7Ozs7Ozs7O09BVUc7SUFDSCxNQUFNLENBQUMsTUFBNEI7UUFDakMsTUFBTSxFQUFFLGFBQWEsRUFBRSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbEQsTUFBTSxHQUFHLEdBQVMsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUU3QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3RCLEdBQUcsTUFBTTtZQUNULFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixRQUFRLEVBQUUsYUFBYSxDQUFDLFFBQVE7WUFDaEMsUUFBUSxFQUFFLFVBQVUsRUFBRTtZQUN0QixTQUFTLEVBQUUsR0FBRztZQUNkLFNBQVMsRUFBRSxhQUFhLENBQUMsT0FBTztZQUNoQyxTQUFTLEVBQUUsR0FBRztZQUNkLFNBQVMsRUFBRSxhQUFhLENBQUMsT0FBTztTQUM1QixDQUFDLENBQUM7SUFDVixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsSUFBSSxDQUFDLFFBQWdCO1FBQ25CLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQztRQUUzRCxNQUFNLFFBQVEsR0FBZTtZQUMzQixRQUFRO1lBQ1IsUUFBUTtTQUNLLENBQUM7UUFFaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7O09BV0c7SUFDSCxNQUFNLENBQUMsUUFBZ0IsRUFBRSxPQUF5QjtRQUNoRCxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDO1FBRXBFLE1BQU0sUUFBUSxHQUFlO1lBQzNCLFFBQVE7WUFDUixRQUFRO1NBQ0ssQ0FBQztRQUVoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTtZQUNoQyxHQUFHLE9BQU87WUFDVixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDckIsU0FBUyxFQUFFLE9BQU87U0FDbkIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7Ozs7Ozs7O09BVUc7SUFDSCxNQUFNLENBQUMsUUFBZ0I7UUFDckIsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDO1FBRTNELE1BQU0sUUFBUSxHQUFlO1lBQzNCLFFBQVE7WUFDUixRQUFRO1NBQ0ssQ0FBQztRQUVoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxJQUFJLENBQUMsV0FBdUIsRUFBRSxFQUFFLE9BQTBCO1FBQ3hELE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQztRQUUzRCxNQUFNLFNBQVMsR0FBeUI7WUFDdEMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUU7WUFDekMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUU7U0FDekMsQ0FBQztRQUVGLE1BQU0sV0FBVyxHQUFtQjtZQUNsQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQTJCO1lBQzNDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixPQUFPLEVBQUUsU0FBUztTQUNuQixDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7OztPQWFHO0lBQ0gsT0FBTyxDQUFDLFFBQW9CLEVBQUUsT0FBMEI7UUFDdEQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUNGIn0=
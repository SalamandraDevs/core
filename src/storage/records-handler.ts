import { randomUUID } from 'node:crypto';

import type { ICrud } from '../infra/database/contracts.js';
import type { IExecutionCtxProvider } from '../runtime/contracts.js';
import type { FindAllOptions, FindOptions, FindOrder } from '../infra/database/types.js';
import type { FindResult } from '../infra/database/types.js';
import type { BaseRecord, RecordChanges, RecordCreateInput } from './types.js';
import type { RecordFindOptions } from './types.js';

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
export abstract class RecordsHandler<T extends BaseRecord> {
  /**
   * Creates a record handler bound to one CRUD adapter and one execution context provider.
   *
   * @param crud - Backend-neutral persistence contract for the record.
   * @param executionCtx - Provider of the tenant and actor for the current request or job.
   * @param handlerName - Stored handler discriminator applied to created records.
   */
  protected constructor(
    protected readonly crud: ICrud<T>,
    protected readonly executionCtx: IExecutionCtxProvider,
    private readonly handlerName: T['handlerName']
  ) {}

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
  create(record: RecordCreateInput<T>): Promise<T> {
    const { authenticated } = this.executionCtx.get();
    const now: Date = new Date();

    return this.crud.create({
      ...record,
      handlerName: this.handlerName,
      tenantId: authenticated.tenantId,
      recordId: randomUUID(),
      createdAt: now,
      createdBy: authenticated.actorId,
      updatedAt: now,
      updatedBy: authenticated.actorId
    } as T);
  }

  /**
   * Reads one active record by its public identifier within the current tenant.
   *
   * @param recordId - BaseRecord identifier (`recordId`).
   * @returns The matching record, or `null` when none exists for the tenant.
   * @throws {CustomError} EXECUTION_CONTEXT_ERROR when no execution context is bound.
   */
  read(recordId: string): Promise<T | null> {
    const { tenantId } = this.executionCtx.get().authenticated;

    const criteria: Partial<T> = {
      recordId,
      tenantId
    } as Partial<T>;

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
  update(recordId: string, changes: RecordChanges<T>): Promise<T | null> {
    const { actorId, tenantId } = this.executionCtx.get().authenticated;

    const criteria: Partial<T> = {
      recordId,
      tenantId
    } as Partial<T>;

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
  delete(recordId: string): Promise<T | null> {
    const { tenantId } = this.executionCtx.get().authenticated;

    const criteria: Partial<T> = {
      recordId,
      tenantId
    } as Partial<T>;

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
  find(criteria: Partial<T> = {}, options: RecordFindOptions): Promise<FindResult<T>> {
    const { tenantId } = this.executionCtx.get().authenticated;

    const findOrder: readonly FindOrder[] = [
      { field: 'createdAt', direction: 'desc' },
      { field: 'recordId', direction: 'desc' }
    ];

    const findOptions: FindOptions<T> = {
      cursor: options.cursor as Partial<T> | null,
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
  findAll(criteria: Partial<T>, options: FindAllOptions<T>): Promise<readonly T[]> {
    return this.crud.findAll(criteria, options);
  }
}

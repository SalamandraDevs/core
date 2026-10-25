import { randomUUID } from 'node:crypto';

import { getExecutionCtx } from '../utils/context.js';
import type { ICrud } from '../infra/database/contracts.js';
import type { FindOptions, FindOrder, FindResult } from '../infra/database/types.js';
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
 * propagates the {@link getExecutionCtx} failure when no context is bound.
 * @group Storage
 * @category Storage
 * @template T - Concrete record type extending {@link BaseRecord}.
 */
export abstract class RecordsHandler<T extends BaseRecord> {
  /**
   * Creates a record handler bound to one CRUD adapter.
   *
   * @param crud - Backend-neutral persistence contract for the record.
   * @param handlerName - Stored handler discriminator applied to created records.
   */
  protected constructor(
    protected readonly crud: ICrud<T>,
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
   * @throws {CustomError} RESOURCE_NOT_FOUND when no execution context is bound.
   */
  create(record: RecordCreateInput<T>): Promise<T> {
    const { authenticated } = getExecutionCtx();
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
   * @throws {CustomError} RESOURCE_NOT_FOUND when no execution context is bound.
   */
  read(recordId: string): Promise<T | null> {
    const { tenantId } = getExecutionCtx().authenticated;

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
   * @throws {CustomError} RESOURCE_NOT_FOUND when no execution context is bound.
   */
  update(recordId: string, changes: RecordChanges<T>): Promise<T | null> {
    const { actorId, tenantId } = getExecutionCtx().authenticated;

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
   * @throws {CustomError} RESOURCE_NOT_FOUND when no execution context is bound.
   */
  delete(recordId: string): Promise<T | null> {
    const { tenantId } = getExecutionCtx().authenticated;

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
   * @throws {CustomError} RESOURCE_NOT_FOUND when no execution context is bound.
   */
  find(criteria: Partial<T> = {}, options: RecordFindOptions): Promise<FindResult<T>> {
    const { tenantId } = getExecutionCtx().authenticated;

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
}

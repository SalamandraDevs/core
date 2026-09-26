import { randomUUID } from 'node:crypto';

import { getExecutionCtx } from '../utils/context.js';
import type { ICrud } from '../infra/database/contracts.js';
import type { FindOptions, FindOrder, FindResult } from '../infra/database/types.js';
import type { BaseRecord, RecordChanges, RecordCreateInput } from './types.js';
import type { RecordFindOptions } from './types.js';

/**
 * Base record handler class that applies tenant scope and delegates persistence to `ICrud`.
 */
export abstract class RecordsHandler<T extends BaseRecord> {
  /**
   * Creates a record handler bound to one CRUD adapter.
   * @param crud - Backend-neutral persistence contract for the record.
   * @param handlerName - Stored handler discriminator applied to created records.
   */
  protected constructor(
    protected readonly crud: ICrud<T>,
    private readonly handlerName: T['handlerName']
  ) {}

  /**
   * Creates a new record for the current execution context tenant.
   * Generates backend-neutral identity and metadata before persistence.
   * @param record - BaseRecord input without policy-owned metadata.
   * @returns - The created record.
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
   * @param recordId - BaseRecord identifier (`recordId`).
   * @returns - The matching record, or null when not found.
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
   * @param recordId - BaseRecord identifier (`recordId`).
   * @param changes - Allowed field changes for the record.
   * @returns - The updated record, or null when not found.
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
   * The public method accepts only `recordId`; the tenant identifier is derived from
   * the authenticated execution context and combined with it for the deletion.
   * @param recordId - BaseRecord identifier (`recordId`).
   * @returns - The deleted record, or null when not found.
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
   * @param criteria - Optional record fields and values used to filter the records.
   * @param options - Required cursor and page-size controls.
   * @returns - Matching records.
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

import { randomUUID } from 'node:crypto';

import { getExecutionCtx } from '../utils/context.js';
import type { ICrud } from '../database/contracts.js';
import type { FindOptions, FindOrder, FindResult } from '../database/types.js';
import type { Entity, EntityChanges, EntityCreateInput } from './types.js';
import type { EntityFindOptions } from './types.js';

/**
 * Base entity policy class that applies tenant scope and delegates persistence to `ICrud`.
 */
export abstract class Entities<T extends Entity> {
  /**
   * Creates an entity policy bound to one CRUD adapter.
   * @param crud - Backend-neutral persistence contract for the entity record.
   */
  protected constructor(
    protected readonly crud: ICrud<T>,
    private readonly entityName: T['entityName']
  ) {}

  /**
   * Creates a new entity record for the current execution context tenant.
   * Generates backend-neutral identity and metadata before persistence.
   * @param record - Entity input without policy-owned metadata.
   * @returns - The created entity record.
   */
  create(record: EntityCreateInput<T>): Promise<T> {
    const { authenticated } = getExecutionCtx();
    const now: Date = new Date();

    return this.crud.create({
      ...record,
      entityName: this.entityName,
      tenantId: authenticated.tenantId,
      entityId: randomUUID(),
      createdAt: now,
      createdBy: authenticated.actorId,
      updatedAt: now,
      updatedBy: authenticated.actorId
    } as T);
  }

  /**
   * Reads one active entity record by its public identifier within the current tenant.
   * @param entityId - Entity identifier (`entityId`).
   * @returns - The matching entity record, or null when not found.
   */
  read(entityId: string): Promise<T | null> {
    const { tenantId } = getExecutionCtx().authenticated;

    const criteria: Partial<T> = {
      entityId,
      tenantId
    } as Partial<T>;

    return this.crud.read(criteria);
  }

  /**
   * Updates one active entity record by its public identifier within the current tenant.
   * @param entityId - Entity identifier (`entityId`).
   * @param changes - Allowed field changes for the entity record.
   * @returns - The updated entity record, or null when not found.
   */
  update(entityId: string, changes: EntityChanges<T>): Promise<T | null> {
    const { actorId, tenantId } = getExecutionCtx().authenticated;

    const criteria: Partial<T> = {
      entityId,
      tenantId
    } as Partial<T>;

    return this.crud.update(criteria, {
      ...changes,
      updatedAt: new Date(),
      updatedBy: actorId
    });
  }

  /**
   * Physically deletes one entity record by its public identifier within the current tenant.
   * The public method accepts only `entityId`; the tenant identifier is derived from
   * the authenticated execution context and combined with it for the deletion.
   * @param entityId - Entity identifier (`entityId`).
   * @returns - The deleted entity record, or null when not found.
   */
  delete(entityId: string): Promise<T | null> {
    const { tenantId } = getExecutionCtx().authenticated;

    const criteria: Partial<T> = {
      entityId,
      tenantId
    } as Partial<T>;

    return this.crud.delete(criteria);
  }

  /**
   * Finds active entity records within the current tenant.
   * @param criteria - Optional entity fields and values used to filter the records.
   * @param options - Required cursor and page-size controls.
   * @returns - Matching entity records.
   */
  find(criteria: Partial<T> = {}, options: EntityFindOptions): Promise<FindResult<T>> {
    const { tenantId } = getExecutionCtx().authenticated;

    const findOrder: readonly FindOrder[] = [
      { field: 'createdAt', direction: 'desc' },
      { field: 'entityId', direction: 'desc' }
    ];

    const findOptions: FindOptions<T> = {
      cursor: options.cursor as Partial<T> | null,
      limit: options.limit,
      orderBy: findOrder
    };

    return this.crud.find({ ...criteria, tenantId }, findOptions);
  }
}

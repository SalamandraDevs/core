import { randomUUID } from 'node:crypto';

import { getExecutionCtx } from '../utils/context.js';
import type { EntityCrud } from '../database/base/contracts.js';
import type { Entity, EntityChanges, EntityCreateInput } from './types.js';

/**
 * Base entity policy class that applies tenant scope and delegates persistence to `ICrud`.
 */
export abstract class Entities<T extends Entity> {
  /**
   * Creates an entity policy bound to one CRUD adapter.
   * @param crud - Backend-neutral persistence contract for the entity record.
   */
  protected constructor(protected readonly crud: EntityCrud<T>) {}

  /**
   * Reads one soft-deleted entity using already-scoped criteria.
   * @param criteria - Entity fields used for the lookup.
   * @returns - The matching soft-deleted record, or null when not found.
   */
  protected readDeleted(criteria: Partial<T>): Promise<T | null> {
    return this.crud.readDeleted(criteria);
  }

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
      tenantId: authenticated.tenantId,
      entityId: randomUUID(),
      createdAt: now,
      createdBy: authenticated.actorId,
      updatedAt: now,
      updatedBy: authenticated.actorId,
      deletedAt: null,
      deletedBy: null
    } as T);
  }

  /**
   * Reads one active entity record by its public identifier within the current tenant.
   * @param entityId - Entity identifier (`entityId`).
   * @param options - Lookup options.
   * @param options.includeDeleted - When true, soft-deleted records are included.
   * @returns - The matching entity record, or null when not found.
   */
  read(
    entityId: string,
    { includeDeleted = false }: { includeDeleted?: boolean } = {}
  ): Promise<T | null> {
    const { tenantId } = getExecutionCtx().authenticated;

    const criteria: Partial<T> = {
      entityId,
      tenantId,
      ...(includeDeleted ? {} : { deletedAt: null })
    } as Partial<T>;

    return this.crud.read(criteria);
  }

  /**
   * Updates one active entity record by its public identifier within the current tenant.
   * @param entityId - Entity identifier (`entityId`).
   * @param changes - Allowed field changes for the entity record.
   * @param options - Update options.
   * @param options.includeDeleted - When true, soft-deleted records may be updated.
   * @returns - The updated entity record, or null when not found.
   */
  update(
    entityId: string,
    changes: EntityChanges<T>,
    { includeDeleted = false }: { includeDeleted?: boolean } = {}
  ): Promise<T | null> {
    const { actorId, tenantId } = getExecutionCtx().authenticated;

    const criteria: Partial<T> = {
      entityId,
      tenantId,
      ...(includeDeleted ? {} : { deletedAt: null })
    } as Partial<T>;

    return this.crud.update(criteria, {
      ...changes,
      updatedAt: new Date(),
      updatedBy: actorId
    });
  }

  /**
   * Soft deletes one active entity record by its public identifier within the current tenant.
   * @param entityId - Entity identifier (`entityId`).
   * @returns - The soft-deleted entity record, or null when not found.
   */
  delete(entityId: string): Promise<T | null> {
    const { actorId, tenantId } = getExecutionCtx().authenticated;

    const criteria: Partial<T> = {
      entityId,
      tenantId,
      deletedAt: null
    } as Partial<T>;

    const now: Date = new Date();

    return this.crud.update(criteria, {
      deletedAt: now,
      updatedAt: now,
      updatedBy: actorId,
      deletedBy: actorId
    } as Partial<T>);
  }

  /**
   * Restores one soft-deleted entity record within the current tenant.
   *
   * Implementers must enforce entity-specific authorization before persistence.
   * All lookups and mutations must use compound criteria `{ entityId, tenantId }`
   * where `tenantId` comes from `getExecutionCtx().authenticated.tenantId`.
   *
   * Expected persistence flow:
   * 1. Read using compound `{ entityId, tenantId }` without adding a deletion filter.
   * 2. Return `null` when not found or when `deletedAt` is already `null`.
   * 3. Update with compound criteria `{ entityId, tenantId }` and set
   *    `deletedAt: null`, `deletedBy: null`, `updatedAt`, and `updatedBy`.
   * @param entityId - Entity identifier (`entityId`).
   * @returns - The restored entity record, or null when not found or not deleted.
   */
  abstract restore(entityId: string): Promise<T | null>;

  /**
   * Physically removes one entity record within the current tenant.
   *
   * Implementers must enforce entity-specific authorization before persistence.
   * Hard delete is irreversible. Use compound criteria `{ entityId, tenantId }`
   * where `tenantId` comes from `getExecutionCtx().authenticated.tenantId`.
   *
   * Expected persistence flow:
   * 1. Call `this.crud.delete({ entityId, tenantId })`.
   * 2. Return deleted record snapshot, or `null` when not found.
   *
   * Applies to active and soft-deleted records. Do not add `deletedAt` to criteria.
   * @param entityId - Entity identifier (`entityId`).
   * @returns - The removed entity record, or null when not found.
   */
  abstract remove(entityId: string): Promise<T | null>;
}

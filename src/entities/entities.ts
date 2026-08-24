import { randomUUID } from 'node:crypto';

import { getExecutionCtx } from '../utils/context.js';
import type { ICrud } from '../database/base/contracts.js';
import type { Entity, EntityChanges, EntityCreateInput } from './types.js';

/**
 * Base entity policy class that applies tenant scope and delegates persistence to `ICrud`.
 */
export abstract class Entities<T extends Entity> {
  /**
   * Creates an entity policy bound to one CRUD adapter.
   * @param crud - Backend-neutral persistence contract for the entity record.
   */
  protected constructor(protected readonly crud: ICrud<T>) {}

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
      deletedAt: null
    } as T);
  }

  /**
   * Reads one entity record by its public identifier within the current tenant.
   * @param entityId - Entity identifier (`entityId`).
   * @param scope - When `softDeleted` is false, soft-deleted records are hidden.
   * @returns - The matching entity record, or null when not found.
   */
  read(
    entityId: string,
    { softDeleted }: { softDeleted: boolean } = { softDeleted: false }
  ): Promise<T | null> {
    const { tenantId } = getExecutionCtx().authenticated;

    return this.crud.read({
      entityId,
      tenantId,
      ...(softDeleted ? {} : { deletedAt: null })
    } as Partial<T>);
  }

  /**
   * Updates one entity record by its public identifier within the current tenant.
   * @param entityId - Entity identifier (`entityId`).
   * @param changes - Allowed field changes for the entity record.
   * @param scope - When `softDeleted` is false, soft-deleted records are not updated.
   * @returns - The updated entity record, or null when not found.
   */
  async update(
    entityId: string,
    changes: EntityChanges<T>,
    { softDeleted }: { softDeleted: boolean } = { softDeleted: false }
  ): Promise<T | null> {
    const { actorId, tenantId } = getExecutionCtx().authenticated;

    const criteria: Partial<T> = {
      entityId,
      tenantId,
      ...(softDeleted ? {} : { deletedAt: null })
    } as Partial<T>;
    
    const record: T | null = await this.crud.read(criteria);

    if (!record) {
      return null;
    }

    return this.crud.update(criteria, {
      ...changes,
      updatedAt: new Date(),
      updatedBy: actorId
    });
  }

  /**
   * Deletes one entity record by its public identifier within the current tenant.
   * @param entityId - Entity identifier (`entityId`).
   * @param mode - When `hard` is true, physically removes the record; otherwise soft deletes it.
   * @returns - The deleted entity record, or null when not found.
   */
  async delete(
    entityId: string,
    { hard }: { hard: boolean } = { hard: false }
  ): Promise<T | null> {
    const { actorId, tenantId } = getExecutionCtx().authenticated;

    if (hard) {
      return this.crud.delete({ entityId, tenantId } as Partial<T>);
    }

    const criteria: Partial<T> = {
      entityId,
      tenantId,
      deletedAt: null
    } as Partial<T>;
    
    const record: T | null = await this.crud.read(criteria);

    if (!record) {
      return null;
    }

    const now: Date = new Date();

    return this.crud.update(criteria, {
      deletedAt: now,
      updatedAt: now,
      updatedBy: actorId
    } as Partial<T>);
  }
}

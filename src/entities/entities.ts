import { randomUUID } from 'node:crypto';

import type { ICrud } from '../database/contracts.js';
import type { Entity } from './types.js';
import type { EntityChanges, EntityCreateInput } from './types.js';

/**
 * Base entity policy class that applies tenant scope and delegates persistence to `ICrud`.
 */
export abstract class Entities<T extends Entity> {
  /**
   * Creates an entity policy bound to one tenant-scoped CRUD adapter.
   * @param crud - Backend-neutral persistence contract for the entity record.
   * @param tenantId - Trusted tenant scope applied to every operation.
   */
  protected constructor(
    protected readonly crud: ICrud<T>,
    protected readonly tenantId: string
  ) {}

  /**
   * Creates a new entity record for the bound tenant.
   * Generates backend-neutral identity and applies trusted tenant scope before persistence.
   * @param record - Entity input without policy-owned identity or tenant metadata.
   * @returns - The created entity record.
   */
  create(record: EntityCreateInput<T>): Promise<T> {
    return this.crud.create({
      ...record,
      tenantId: this.tenantId,
      entityId: randomUUID()
    } as T);
  }

  /**
   * Reads one entity record by its public identifier.
   * @param id - Entity identifier (`entityId`).
   * @returns - The matching entity record, or null when not found.
   */
  read(id: string): Promise<T | null> {
    return this.crud.read('entityId', id);
  }

  /**
   * Updates one entity record by its public identifier.
   * @param id - Entity identifier (`entityId`).
   * @param changes - Allowed field changes for the entity record.
   * @returns - The updated entity record, or null when not found.
   */
  update(id: string, changes: EntityChanges<T>): Promise<T | null> {
    return this.crud.update('entityId', id, changes);
  }

  /**
   * Deletes one entity record by its public identifier.
   * @param id - Entity identifier (`entityId`).
   * @returns - The deleted entity record, or null when not found.
   */
  delete(id: string): Promise<T | null> {
    return this.crud.delete('entityId', id);
  }
}

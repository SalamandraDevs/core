import type { Collection, Filter } from 'mongodb';
import type { OptionalUnlessRequiredId, WithId } from 'mongodb';

import { assertCriteria } from '../../utils/validators.js';
import type { ICrud } from '../base/contracts.js';
import type { GeneralRecord } from '../types.js';

/**
 * MongoDB implementation of the backend-neutral CRUD contract.
 *
 * Criteria are not verified as unique. Policy layer (e.g. Entities class) must use fields
 * backed by appropriate unique constraints when deterministic targeting is required.
 */
export class MongoCrud<T extends GeneralRecord> implements ICrud<T> {
  /**
   * Creates a Mongo CRUD adapter for one collection.
   * @param collection - Mongo collection that stores the entity records.
   */
  constructor(private readonly collection: Collection<T>) {}

  /**
   * Persists one entity record in MongoDB and returns the stored record.
   * MongoDB driver generates storage-owned `_id` on a copy so it cannot leak to the caller.
   * @param record - Complete entity record to store.
   * @returns - Stored backend-neutral record without MongoDB `_id`.
   */
  async create(record: T): Promise<T> {
    await this.collection.insertOne({
      ...record
    } as OptionalUnlessRequiredId<T>);

    return record;
  }

  /**
   * Reads one entity record matching all criteria fields and returns the match, or null.
   * Returns the full stored document without Mongo `_id`; null only when not found.
   * @param criteria - Entity fields and values used for the lookup.
   * @returns - Matching backend-neutral record, or null when not found.
   */
  async read(criteria: Partial<T>): Promise<T | null> {
    assertCriteria(criteria);
    const document: WithId<T> | null = await this.collection.findOne(criteria as Filter<T>);

    if (!document) {
      return null;
    }

    return this.returnRecord(document);
  }

  /**
   * Updates one entity record matching all criteria fields and returns the updated
   * record, or null.
   * Returns the full stored document without Mongo `_id`; null only when not found.
   * @param criteria - Entity fields and values used for the lookup.
   * @param changes - Partial entity record with fields to update.
   * @returns - Updated backend-neutral record, or null when not found.
   */
  async update(criteria: Partial<T>, changes: Partial<T>): Promise<T | null> {
    assertCriteria(criteria);
    const document: WithId<T> | null = await this.collection.findOneAndUpdate(
      criteria as Filter<T>,
      {
        $set: changes
      },
      { returnDocument: 'after' }
    );

    if (!document) {
      return null;
    }

    return this.returnRecord(document);
  }

  /**
   * Deletes one entity record matching all criteria fields and returns the deleted
   * record, or null.
   * Returns the full stored document without Mongo `_id`; null only when not found.
   * @param criteria - Entity fields and values used for the lookup.
   * @returns - Deleted backend-neutral record, or null when not found.
   */
  async delete(criteria: Partial<T>): Promise<T | null> {
    assertCriteria(criteria);
    const document: WithId<T> | null = await this.collection.findOneAndDelete(
      criteria as Filter<T>
    );

    if (!document) {
      return null;
    }

    return this.returnRecord(document);
  }

  /**
   * Removes MongoDB storage identity from one returned document.
   * @param document - Full MongoDB document including storage-owned `_id`.
   * @returns - Backend-neutral record without MongoDB `_id`.
   */
  private returnRecord(document: WithId<T>): T {
    const { _id: mongoId, ...record } = document;
    void mongoId;

    return record as unknown as T;
  }

}

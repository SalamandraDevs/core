import type {
  Collection,
  Document,
  Filter,
  OptionalUnlessRequiredId,
  WithId
} from 'mongodb';

import type { ICrud } from '../contracts.js';

/**
 * MongoDB implementation of the backend-neutral CRUD contract.
 *
 * Lookup keys are not verified as unique. Policy layer (e.g. Entities class) must use fields
 * backed by appropriate unique constraints when deterministic targeting is required.
 */
export class MongoCrud<T extends Document> implements ICrud<T> {
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
   * Reads one entity record from MongoDB by field value and returns the match, or null.
   * Returns the full stored document without Mongo `_id`; null only when not found.
   * @param key - Entity field used for the lookup.
   * @param value - Field value to match.
   * @returns - Matching backend-neutral record, or null when not found.
   */
  async read<K extends keyof T>(key: K, value: T[K]): Promise<T | null> {
    const document: WithId<T> | null = await this.collection.findOne({
      [key]: value
    } as Filter<T>);

    if (!document) {
      return null;
    }

    return this.returnRecord(document);
  }

  /**
   * Updates one entity record in MongoDB by field value and returns the updated record, or null.
   * Returns the full stored document without Mongo `_id`; null only when not found.
   * @param key - Entity field used for the lookup.
   * @param value - Field value to match.
   * @param changes - Partial entity record with fields to update.
   * @returns - Updated backend-neutral record, or null when not found.
   */
  async update<K extends keyof T>(
    key: K,
    value: T[K],
    changes: Partial<T>
  ): Promise<T | null> {
    const document: WithId<T> | null = await this.collection.findOneAndUpdate(
      {
        [key]: value
      } as Filter<T>,
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
   * Deletes one entity record from MongoDB by field value and returns the deleted record, or null.
   * Returns the full stored document without Mongo `_id`; null only when not found.
   * @param key - Entity field used for the lookup.
   * @param value - Field value to match.
   * @returns - Deleted backend-neutral record, or null when not found.
   */
  async delete<K extends keyof T>(key: K, value: T[K]): Promise<T | null> {
    const document: WithId<T> | null = await this.collection.findOneAndDelete({
      [key]: value
    } as Filter<T>);

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

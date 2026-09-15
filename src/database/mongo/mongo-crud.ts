import { CustomError, errMessages } from '@slmdevs/tools/shared';
import type { Collection, Filter, Sort } from 'mongodb';
import type { OptionalUnlessRequiredId, WithId } from 'mongodb';

import { assertCriteria, isMongoDupKeyError } from '../utils.js';
import type { ICrud } from '../contracts.js';
import type { FindOptions, FindOrder, FindResult } from '../types.js';
import type { GeneralRecord } from '../types.js';

/**
 * MongoDB implementation of the backend-neutral CRUD contract.
 *
 * Criteria are not verified as unique. Record layer (e.g. RecordsHandler class) must use fields
 * backed by appropriate unique constraints when deterministic targeting is required.
 */
export class MongoCrud<T extends GeneralRecord> implements ICrud<T> {
  /**
   * Creates a Mongo CRUD adapter for one collection.
   * @param collection - Mongo collection that stores the records.
   */
  constructor(private readonly collection: Collection<T>) {}

  /**
   * Persists one record in MongoDB and returns the stored record.
   * MongoDB driver generates storage-owned `_id` on a copy so it cannot leak to the caller.
   * @param record - Complete record to store.
   * @returns - Stored backend-neutral record without MongoDB `_id`.
   */
  async create(record: T): Promise<T> {
    try {
      await this.collection.insertOne({
        ...record
      } as OptionalUnlessRequiredId<T>);
    } catch (error: unknown) {
      if (isMongoDupKeyError(error)) {
        throw new CustomError({
          name: 'DB_DUPLICATE_KEY_ERROR',
          message: errMessages.DB_DUPLICATE_KEY,
          cause: error
        });
      }

      throw new CustomError({
        name: 'DB_ADAPTER_ERROR',
        message: 'Failed to create MongoDB record',
        cause: error
      });
    }

    return record;
  }

  /**
   * Reads one record matching all criteria fields and returns the match, or null.
   * Returns the full stored document without Mongo `_id`; null only when not found.
   * @param criteria - BaseRecord fields and values used for the lookup.
   * @returns - Matching backend-neutral record, or null when not found.
   */
  async read(criteria: Partial<T>): Promise<T | null> {
    assertCriteria(criteria);
    const document: WithId<T> | null = await this.collection.findOne(
      criteria as Filter<T>
    );

    if (!document) {
      return null;
    }

    return this.returnRecord(document);
  }

  /**
   * Updates one record matching all criteria fields and returns the updated
   * record, or null.
   * Returns the full stored document without Mongo `_id`; null only when not found.
   * @param criteria - BaseRecord fields and values used for the lookup.
   * @param changes - Partial record with fields to update.
   * @returns - Updated backend-neutral record, or null when not found.
   */
  async update(criteria: Partial<T>, changes: Partial<T>): Promise<T | null> {
    assertCriteria(criteria);

    let document: WithId<T> | null;

    try {
      document = await this.collection.findOneAndUpdate(
        criteria as Filter<T>,
        {
          $set: changes
        },
        { returnDocument: 'after' }
      );
    } catch (error: unknown) {
      if (isMongoDupKeyError(error)) {
        throw new CustomError({
          name: 'DB_DUPLICATE_KEY_ERROR',
          message: errMessages.DB_DUPLICATE_KEY,
          cause: error
        });
      }

      throw new CustomError({
        name: 'DB_ADAPTER_ERROR',
        message: 'Failed to update MongoDB record',
        cause: error
      });
    }

    if (!document) {
      return null;
    }

    return this.returnRecord(document);
  }

  /**
   * Deletes one record matching all criteria fields and returns the deleted
   * record, or null.
   * Returns the full stored document without Mongo `_id`; null only when not found.
   * @param criteria - BaseRecord fields and values used for the lookup.
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
   * Finds records matching all criteria fields and optional page controls.
   * Returned records exclude MongoDB's storage-owned `_id` field.
   * @param criteria - BaseRecord fields and values used for the lookup.
   * @param options - Required cursor and page-size controls.
   * @returns - Matching backend-neutral records and page metadata.
   */
  async find(criteria: Partial<T>, options: FindOptions<T>): Promise<FindResult<T>> {
    assertCriteria(criteria);
    const limit: number = options.limit;
    const queryLimit: number = limit + 1;
    const filter: Filter<T> = this.buildFindFilter(
      criteria,
      options.cursor,
      options.orderBy
    );

    const documents: WithId<T>[] = await this.collection
      .find(filter)
      .sort(this.buildSort(options.orderBy))
      .limit(queryLimit)
      .toArray();

    const hasNextPage: boolean = documents.length > limit;
    const returnedDocuments: WithId<T>[] = hasNextPage
      ? documents.slice(0, limit)
      : documents;

    return {
      records: returnedDocuments.map((document: WithId<T>) => this.returnRecord(document)),
      hasNextPage
    };
  }

  /**
   * Builds a MongoDB filter from backend-neutral exact criteria and cursor options.
   * @param criteria - Exact field criteria already owned by the caller policy.
   * @param cursor - Last seen ordered field values used to continue the page.
   * @param orderBy - Ordered fields that define deterministic cursor continuation.
   * @returns - MongoDB filter translated from the backend-neutral find inputs.
   */
  private buildFindFilter(
    criteria: Partial<T>,
    cursor: Partial<T> | null,
    orderBy: readonly FindOrder[]
  ): Filter<T> {
    if (!cursor) {
      return criteria as Filter<T>;
    }

    const cursorBranches: Record<string, unknown>[] = [];
    const precedingCursorValues: Record<string, unknown> = {};

    for (const order of orderBy) {
      const comparisonOperator: '$gt' | '$lt' =
        order.direction === 'asc' ? '$gt' : '$lt';

      // A later sort field can continue the page only after all earlier fields tie.
      cursorBranches.push({
        ...precedingCursorValues,
        [order.field]: {
          [comparisonOperator]: cursor[order.field]
        }
      });

      precedingCursorValues[order.field] = cursor[order.field];
    }

    return {
      $and: [
        criteria,
        {
          $or: cursorBranches
        }
      ]
    } as Filter<T>;
  }

  /**
   * Builds a MongoDB sort document from backend-neutral ordered fields.
   * @param orderBy - Ordered fields that define deterministic result order.
   * @returns - MongoDB sort document.
   */
  private buildSort(orderBy: readonly FindOrder[]): Sort {
    const sortEntries: [string, 1 | -1][] = orderBy.map(
      (order: FindOrder): [string, 1 | -1] => [
        order.field,
        order.direction === 'asc' ? 1 : -1
      ]
    );

    return Object.fromEntries(sortEntries);
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

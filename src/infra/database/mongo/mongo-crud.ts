import { CustomError, errMessages } from '@slmdevs/tools/shared';
import type { Collection, Filter, Sort } from 'mongodb';
import type { OptionalUnlessRequiredId, WithId } from 'mongodb';

import { assertCriteria, isMongoDupKeyError } from '../utils.js';
import type { ICrud } from '../contracts.js';
import type { FindOptions, FindOrder, FindResult } from '../types.js';
import type { GeneralRecord } from '../types.js';

/**
 * MongoDB implementation of the backend-neutral {@link ICrud} contract.
 * @remarks
 * Criteria are not verified as unique: the single-record operations act on the first match, so
 * the record layer (for example {@link RecordsHandler}) must target fields backed by a unique
 * index when deterministic addressing is required. Every returned record is stripped of the
 * storage-owned `_id`, keeping the surface backend-neutral, and `find` implements keyset
 * pagination over the requested order. Duplicate-key violations are re-classified as
 * `DB_DUPLICATE_KEY_ERROR`; other driver failures become `DB_ADAPTER_ERROR`.
 * @template T - Record shape stored in the collection.
 * @group Database
 * @category Database
 */
export class MongoCrud<T extends GeneralRecord> implements ICrud<T> {
  /**
   * Creates a Mongo CRUD adapter for one collection.
   * @param collection - Mongo collection that stores the records.
   */
  constructor(private readonly collection: Collection<T>) {}

  /**
   * Persists one record in MongoDB and returns the stored record.
   * @param record - Complete record to store.
   * @returns Stored backend-neutral record without MongoDB `_id`.
   * @throws {CustomError} DB_DUPLICATE_KEY_ERROR when the insert violates a unique index.
   * @throws {CustomError} DB_ADAPTER_ERROR when the insert fails for any other reason.
   * @remarks
   * The driver assigns the storage-owned `_id` to a spread copy, so it never leaks back onto the
   * caller's record instance.
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
   * @param criteria - BaseRecord fields and values used for the lookup.
   * @returns Matching backend-neutral record without Mongo `_id`, or `null` when none matches.
   * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
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
   * Updates one record matching all criteria fields and returns the updated record, or null.
   * @param criteria - BaseRecord fields and values used for the lookup.
   * @param changes - Partial record with fields to update.
   * @returns Updated backend-neutral record without Mongo `_id`, or `null` when none matches.
   * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
   * @throws {CustomError} DB_DUPLICATE_KEY_ERROR when the update violates a unique index.
   * @throws {CustomError} DB_ADAPTER_ERROR when the update fails for any other reason.
   * @remarks
   * Applies `changes` with `$set` and returns the post-update document, so the caller observes
   * the persisted state rather than its requested changes.
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
   * Deletes one record matching all criteria fields and returns the deleted record, or null.
   * @param criteria - BaseRecord fields and values used for the lookup.
   * @returns Deleted backend-neutral record without Mongo `_id`, or `null` when none matches.
   * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
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
   * @param criteria - BaseRecord fields and values used for the lookup.
   * @param options - Required cursor and page-size controls.
   * @returns Matching backend-neutral records (without `_id`) and page metadata.
   * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
   * @remarks
   * Over-fetches one row beyond `limit` to compute `hasNextPage` without a second count query,
   * then drops the extra row from the returned page.
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
   * @returns MongoDB filter translated from the backend-neutral find inputs.
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
   * @returns MongoDB sort document.
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
   * @returns Backend-neutral record without MongoDB `_id`.
   */
  private returnRecord(document: WithId<T>): T {
    const { _id: mongoId, ...record } = document;
    void mongoId;

    return record as unknown as T;
  }
}

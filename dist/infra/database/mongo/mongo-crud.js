import { CustomError, errMessages } from '@salamandradevs/tools/shared';
import { assertCriteria, isMongoDupKeyError } from '../utils.js';
/**
 * MongoDB implementation of the backend-neutral {@link ICrud} contract.
 *
 * @remarks
 * Criteria are not verified as unique: the single-record operations act on the first match,
 * so the record layer (for example {@link RecordsHandler}) must target fields backed by a
 * unique index when deterministic addressing is required. Every returned record is stripped
 * of the storage-owned `_id`, keeping the surface backend-neutral, and `find` implements
 * keyset pagination over the requested order. Duplicate-key violations are re-classified as
 * `DB_DUPLICATE_KEY_ERROR`; other driver failures become `DB_BACKEND_ERROR`.
 * @group Infra
 * @category Database
 * @template T - Record shape stored in the collection.
 */
export class MongoCrud {
    collection;
    /**
     * Creates a Mongo CRUD adapter for one collection.
     *
     * @param collection - Mongo collection that stores the records.
     */
    constructor(collection) {
        this.collection = collection;
    }
    /**
     * Persists one record in MongoDB and returns the stored record.
     *
     * @remarks
     * The driver assigns the storage-owned `_id` to a spread copy, so it never leaks back
     * onto the caller's record instance.
     * @param record - Complete record to store.
     * @returns Stored backend-neutral record without MongoDB `_id`.
     * @throws {CustomError} DB_DUPLICATE_KEY_ERROR when the insert violates a unique index.
     * @throws {CustomError} DB_BACKEND_ERROR when the insert fails for any other reason.
     */
    async create(record) {
        try {
            await this.collection.insertOne({
                ...record
            });
        }
        catch (error) {
            if (isMongoDupKeyError(error)) {
                throw new CustomError({
                    name: 'DB_DUPLICATE_KEY_ERROR',
                    message: errMessages.DB_DUPLICATE_KEY,
                    cause: error
                });
            }
            throw new CustomError({
                name: 'DB_BACKEND_ERROR',
                message: 'Failed to create MongoDB record',
                cause: error
            });
        }
        return record;
    }
    /**
     * Reads one record matching all criteria fields and returns the match, or null.
     *
     * @param criteria - BaseRecord fields and values used for the lookup.
     * @returns Matching backend-neutral record without Mongo `_id`, or `null` when none
     *   matches.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     */
    async read(criteria) {
        assertCriteria(criteria);
        const document = await this.collection.findOne(criteria);
        if (!document) {
            return null;
        }
        return this.returnRecord(document);
    }
    /**
     * Updates one record matching all criteria fields and returns the updated record, or
     * null.
     *
     * @remarks
     * Applies `changes` with `$set` and returns the post-update document, so the caller
     * observes the persisted state rather than its requested changes.
     * @param criteria - BaseRecord fields and values used for the lookup.
     * @param changes - Partial record with fields to update.
     * @returns Updated backend-neutral record without Mongo `_id`, or `null` when none
     *   matches.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     * @throws {CustomError} DB_DUPLICATE_KEY_ERROR when the update violates a unique index.
     * @throws {CustomError} DB_BACKEND_ERROR when the update fails for any other reason.
     */
    async update(criteria, changes) {
        assertCriteria(criteria);
        let document;
        try {
            document = await this.collection.findOneAndUpdate(criteria, {
                $set: changes
            }, { returnDocument: 'after' });
        }
        catch (error) {
            if (isMongoDupKeyError(error)) {
                throw new CustomError({
                    name: 'DB_DUPLICATE_KEY_ERROR',
                    message: errMessages.DB_DUPLICATE_KEY,
                    cause: error
                });
            }
            throw new CustomError({
                name: 'DB_BACKEND_ERROR',
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
     * Deletes one record matching all criteria fields and returns the deleted record, or
     * null.
     *
     * @param criteria - BaseRecord fields and values used for the lookup.
     * @returns Deleted backend-neutral record without Mongo `_id`, or `null` when none
     *   matches.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     */
    async delete(criteria) {
        assertCriteria(criteria);
        const document = await this.collection.findOneAndDelete(criteria);
        if (!document) {
            return null;
        }
        return this.returnRecord(document);
    }
    /**
     * Finds records matching all criteria fields and optional page controls.
     *
     * @remarks
     * Over-fetches one row beyond `limit` to compute `hasNextPage` without a second count
     * query, then drops the extra row from the returned page.
     * @param criteria - BaseRecord fields and values used for the lookup.
     * @param options - Required cursor and page-size controls.
     * @returns Matching backend-neutral records (without `_id`) and page metadata.
     * @throws {TypeError} When `criteria` is empty or malformed; see {@link assertCriteria}.
     */
    async find(criteria, options) {
        assertCriteria(criteria);
        const limit = options.limit;
        const queryLimit = limit + 1;
        const filter = this.buildFindFilter(criteria, options.cursor, options.orderBy);
        const documents = await this.collection
            .find(filter)
            .sort(this.buildSort(options.orderBy))
            .limit(queryLimit)
            .toArray();
        const hasNextPage = documents.length > limit;
        const returnedDocuments = hasNextPage
            ? documents.slice(0, limit)
            : documents;
        return {
            records: returnedDocuments.map((document) => this.returnRecord(document)),
            hasNextPage
        };
    }
    /**
     * Builds a MongoDB filter from backend-neutral exact criteria and cursor options.
     *
     * @param criteria - Exact field criteria already owned by the caller policy.
     * @param cursor - Last seen ordered field values used to continue the page.
     * @param orderBy - Ordered fields that define deterministic cursor continuation.
     * @returns MongoDB filter translated from the backend-neutral find inputs.
     */
    buildFindFilter(criteria, cursor, orderBy) {
        if (!cursor) {
            return criteria;
        }
        const cursorBranches = [];
        const precedingCursorValues = {};
        for (const order of orderBy) {
            const comparisonOperator = order.direction === 'asc' ? '$gt' : '$lt';
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
        };
    }
    /**
     * Builds a MongoDB sort document from backend-neutral ordered fields.
     *
     * @param orderBy - Ordered fields that define deterministic result order.
     * @returns MongoDB sort document.
     */
    buildSort(orderBy) {
        const sortEntries = orderBy.map((order) => [
            order.field,
            order.direction === 'asc' ? 1 : -1
        ]);
        return Object.fromEntries(sortEntries);
    }
    /**
     * Removes MongoDB storage identity from one returned document.
     *
     * @param document - Full MongoDB document including storage-owned `_id`.
     * @returns Backend-neutral record without MongoDB `_id`.
     */
    returnRecord(document) {
        const { _id: mongoId, ...record } = document;
        void mongoId;
        return record;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28tY3J1ZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9tb25nby9tb25nby1jcnVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFJeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUtqRTs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsTUFBTSxPQUFPLFNBQVM7SUFNUztJQUw3Qjs7OztPQUlHO0lBQ0gsWUFBNkIsVUFBeUI7UUFBekIsZUFBVSxHQUFWLFVBQVUsQ0FBZTtJQUFHLENBQUM7SUFFMUQ7Ozs7Ozs7Ozs7T0FVRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBUztRQUNwQixJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO2dCQUM5QixHQUFHLE1BQU07YUFDcUIsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFBQyxPQUFPLEtBQWMsRUFBRSxDQUFDO1lBQ3hCLElBQUksa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLFdBQVcsQ0FBQztvQkFDcEIsSUFBSSxFQUFFLHdCQUF3QjtvQkFDOUIsT0FBTyxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0I7b0JBQ3JDLEtBQUssRUFBRSxLQUFLO2lCQUNiLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxNQUFNLElBQUksV0FBVyxDQUFDO2dCQUNwQixJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixPQUFPLEVBQUUsaUNBQWlDO2dCQUMxQyxLQUFLLEVBQUUsS0FBSzthQUNiLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILEtBQUssQ0FBQyxJQUFJLENB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
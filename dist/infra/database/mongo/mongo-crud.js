import { CustomError, errMessages } from '@salamandradevs/tools/shared';
import { assertCriteria, assertFindAllFilter, isMongoDupKeyError } from '../utils.js';
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
     * Returns every record matching the exact criteria and optional range bounds.
     *
     * @remarks
     * Unbounded by default: a numeric `options.limit` caps the result and may truncate it,
     * while `null` reads the full match set. `greaterThan` and `lessThan` are translated to
     * `$gt` and `$lt` here, so those operators never cross {@link ICrud}; order is applied
     * only when `options.orderBy` is given, otherwise the backend's natural order stands.
     * @param criteria - Exact field criteria; may be empty when a range bound is given.
     * @param options - Limit, optional order, and optional exclusive range bounds.
     * @returns Every matching backend-neutral record (without `_id`).
     * @throws {TypeError} When no criteria or range bound selects records; see
     *   {@link assertFindAllFilter}.
     */
    async findAll(criteria, options) {
        assertFindAllFilter(criteria, options.greaterThan, options.lessThan);
        const filter = this.buildRangeFilter(criteria, options.greaterThan, options.lessThan);
        let query = this.collection.find(filter);
        if (options.orderBy) {
            query = query.sort(this.buildSort(options.orderBy));
        }
        if (options.limit !== null) {
            query = query.limit(options.limit);
        }
        const documents = await query.toArray();
        return documents.map((document) => this.returnRecord(document));
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
     * Builds a MongoDB filter from exact criteria and optional exclusive range bounds.
     *
     * @remarks
     * Merges per-field range operators, so a field bounded on both sides yields a single `{
     * $gt, $lt }` object. Exact criteria and a range on the same field are not combined; keep
     * a field in one or the other.
     * @param criteria - Exact field criteria owned by the caller policy.
     * @param greaterThan - Fields with an exclusive lower bound, or undefined.
     * @param lessThan - Fields with an exclusive upper bound, or undefined.
     * @returns MongoDB filter translated from the backend-neutral inputs.
     */
    buildRangeFilter(criteria, greaterThan, lessThan) {
        const filter = { ...criteria };
        for (const [field, value] of Object.entries(greaterThan ?? {})) {
            filter[field] = { ...filter[field], $gt: value };
        }
        for (const [field, value] of Object.entries(lessThan ?? {})) {
            filter[field] = { ...filter[field], $lt: value };
        }
        return filter;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28tY3J1ZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9tb25nby9tb25nby1jcnVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFJeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUt0Rjs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsTUFBTSxPQUFPLFNBQVM7SUFNUztJQUw3Qjs7OztPQUlHO0lBQ0gsWUFBNkIsVUFBeUI7UUFBekIsZUFBVSxHQUFWLFVBQVUsQ0FBZTtJQUFHLENBQUM7SUFFMUQ7Ozs7Ozs7Ozs7T0FVRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBUztRQUNwQixJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO2dCQUM5QixHQUFHLE1BQU07YUFDcUIsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFBQyxPQUFPLEtBQWMsRUFBRSxDQUFDO1lBQ3hCLElBQUksa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLFdBQVcsQ0FBQztvQkFDcEIsSUFBSSxFQUFFLHdCQUF3QjtvQkFDOUIsT0FBTyxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0I7b0JBQ3JDLEtBQUssRUFBRSxLQUFLO2lCQUNiLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxNQUFNLElBQUksV0FBVyxDQUFDO2dCQUNwQixJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixPQUFPLEVBQUUsaUNBQWlDO2dCQUMxQyxLQUFLLEVBQUUsS0FBSzthQUNiLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILEtBQUss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
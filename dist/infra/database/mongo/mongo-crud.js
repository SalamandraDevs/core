import { CustomError, errMessages } from '@salamandradevs/tools/shared';
import { assertCriteria, isMongoDupKeyError } from '../utils.js';
/**
 * MongoDB implementation of the backend-neutral {@link ICrud} contract.
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
     * @param collection - Mongo collection that stores the records.
     */
    constructor(collection) {
        this.collection = collection;
    }
    /**
     * Persists one record in MongoDB and returns the stored record.
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
     * @param document - Full MongoDB document including storage-owned `_id`.
     * @returns Backend-neutral record without MongoDB `_id`.
     */
    returnRecord(document) {
        const { _id: mongoId, ...record } = document;
        void mongoId;
        return record;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28tY3J1ZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9tb25nby9tb25nby1jcnVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFJeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUtqRTs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxNQUFNLE9BQU8sU0FBUztJQUtTO0lBSjdCOzs7T0FHRztJQUNILFlBQTZCLFVBQXlCO1FBQXpCLGVBQVUsR0FBVixVQUFVLENBQWU7SUFBRyxDQUFDO0lBRTFEOzs7Ozs7Ozs7T0FTRztJQUNILEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBUztRQUNwQixJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO2dCQUM5QixHQUFHLE1BQU07YUFDcUIsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFBQyxPQUFPLEtBQWMsRUFBRSxDQUFDO1lBQ3hCLElBQUksa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLFdBQVcsQ0FBQztvQkFDcEIsSUFBSSxFQUFFLHdCQUF3QjtvQkFDOUIsT0FBTyxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0I7b0JBQ3JDLEtBQUssRUFBRSxLQUFLO2lCQUNiLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxNQUFNLElBQUksV0FBVyxDQUFDO2dCQUNwQixJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixPQUFPLEVBQUUsaUNBQWlDO2dCQUMxQyxLQUFLLEVBQUUsS0FBSzthQUNiLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsS0FBSyxDQUFDLElBQUksQ0FBQyxR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
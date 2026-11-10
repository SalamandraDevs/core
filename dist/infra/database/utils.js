/**
 * Asserts criteria is a non-empty plain object (not an array) without undefined values.
 *
 * @remarks
 * A guard the CRUD adapters run before building a query, so a match-all or malformed
 * criteria can never widen into an unbounded update or delete. An `undefined` value is
 * rejected because it would otherwise silently drop from the query and broaden the match.
 * @group Infra
 * @category Database
 * @param input - Criteria object to validate.
 * @throws {TypeError} When the input is not an object, is an array, is empty, or contains
 *   an `undefined` value.
 */
export function assertCriteria(input) {
    if (typeof input !== 'object' ||
        input === null ||
        Array.isArray(input) ||
        Object.keys(input).length === 0 ||
        Object.values(input).includes(undefined)) {
        throw new TypeError('Criteria must be a non-empty object (not an array) without undefined values');
    }
}
/**
 * Asserts a find-all filter selects records through criteria or a range bound.
 *
 * @remarks
 * The guard the CRUD adapters run before an unpaged `findAll`, so an unfiltered scan over a
 * whole collection can never be issued by accident. Unlike {@link assertCriteria}, an empty
 * `criteria` is allowed when a `greaterThan` or `lessThan` bound selects records instead;
 * at least one of the three must carry a field.
 * @group Infra
 * @category Database
 * @param criteria - Exact field criteria, possibly empty.
 * @param greaterThan - Fields with an exclusive lower bound, or undefined.
 * @param lessThan - Fields with an exclusive upper bound, or undefined.
 * @throws {TypeError} When none of criteria, greaterThan, or lessThan carries a field.
 */
export function assertFindAllFilter(criteria, greaterThan, lessThan) {
    const hasFields = (input) => typeof input === 'object' &&
        input !== null &&
        !Array.isArray(input) &&
        Object.keys(input).length > 0;
    if (!hasFields(criteria) && !hasFields(greaterThan) && !hasFields(lessThan)) {
        throw new TypeError('findAll requires exact criteria or a range bound that selects records');
    }
}
/**
 * Detects MongoDB duplicate key errors.
 *
 * @remarks
 * Matches driver codes 11000 and 11001 so a create colliding with a unique index can be
 * re-classified as a `DB_DUPLICATE_KEY_ERROR` rather than surfaced as a raw driver error.
 * @group Infra
 * @category Database
 * @param error - Error thrown by the MongoDB driver.
 * @returns Whether the error represents a unique constraint violation.
 */
export function isMongoDupKeyError(error) {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return false;
    }
    const code = error.code;
    return code === 11000 || code === 11001;
}
/**
 * Detects MySQL duplicate key errors.
 *
 * @remarks
 * Accepts either the `ER_DUP_ENTRY` code or its numeric `errno` 1062, since the mysql2
 * driver may populate one or the other; the MySQL counterpart to
 * {@link isMongoDupKeyError}.
 * @group Infra
 * @category Database
 * @param error - Error thrown by the mysql2 driver.
 * @returns Whether the error represents a unique constraint violation.
 */
export function isMySqlDupKeyError(error) {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const code = 'code' in error ? error.code : undefined;
    const errno = 'errno' in error ? error.errno : undefined;
    return code === 'ER_DUP_ENTRY' || errno === 1062;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5mcmEvZGF0YWJhc2UvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsTUFBTSxVQUFVLGNBQWMsQ0FBQyxLQUFjO0lBQzNDLElBQ0UsT0FBTyxLQUFLLEtBQUssUUFBUTtRQUN6QixLQUFLLEtBQUssSUFBSTtRQUNkLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUM7UUFDL0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQ3hDLENBQUM7UUFDRCxNQUFNLElBQUksU0FBUyxDQUNqQiw2RUFBNkUsQ0FDOUUsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxNQUFNLFVBQVUsbUJBQW1CLENBQ2pDLFFBQWlCLEVBQ2pCLFdBQW9CLEVBQ3BCLFFBQWlCO0lBRWpCLE1BQU0sU0FBUyxHQUFnQyxDQUFDLEtBQWMsRUFBVyxFQUFFLENBQ3pFLE9BQU8sS0FBSyxLQUFLLFFBQVE7UUFDekIsS0FBSyxLQUFLLElBQUk7UUFDZCxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUVoQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDNUUsTUFBTSxJQUFJLFNBQVMsQ0FDakIsdUVBQXVFLENBQ3hFLENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQztBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsS0FBYztJQUMvQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN0RSxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNLElBQUksR0FBWSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBRWpDLE9BQU8sSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxDQUFDO0FBQzFDLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxLQUFjO0lBQy9DLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNoRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNLElBQUksR0FBWSxNQUFNLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDL0QsTUFBTSxLQUFLLEdBQVksT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0lBRWxFLE9BQU8sSUFBSSxLQUFLLGNBQWMsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDO0FBQ25ELENBQUMifQ==
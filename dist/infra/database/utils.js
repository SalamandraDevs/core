/**
 * Asserts criteria is a non-empty plain object (not an array) without undefined values.
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
 * Detects MongoDB duplicate key errors.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5mcmEvZGF0YWJhc2UvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUFDLEtBQWM7SUFDM0MsSUFDRSxPQUFPLEtBQUssS0FBSyxRQUFRO1FBQ3pCLEtBQUssS0FBSyxJQUFJO1FBQ2QsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDcEIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUMvQixNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFDeEMsQ0FBQztRQUNELE1BQU0sSUFBSSxTQUFTLENBQ2pCLDZFQUE2RSxDQUM5RSxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUM7QUFFRDs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsS0FBYztJQUMvQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN0RSxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxNQUFNLElBQUksR0FBWSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBRWpDLE9BQU8sSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxDQUFDO0FBQzFDLENBQUM7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEtBQWM7SUFDL0MsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ2hELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFZLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUMvRCxNQUFNLEtBQUssR0FBWSxPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFFbEUsT0FBTyxJQUFJLEtBQUssY0FBYyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUM7QUFDbkQsQ0FBQyJ9
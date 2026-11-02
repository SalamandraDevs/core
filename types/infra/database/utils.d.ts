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
export declare function assertCriteria(input: unknown): asserts input is Record<string, unknown>;
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
export declare function isMongoDupKeyError(error: unknown): boolean;
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
export declare function isMySqlDupKeyError(error: unknown): boolean;
//# sourceMappingURL=utils.d.ts.map
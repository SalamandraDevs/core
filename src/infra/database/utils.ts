import { isKeyedObject } from '@salamandradevs/tools/shared';

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
export function assertCriteria(input: unknown): asserts input is Record<string, unknown> {
  if (!isKeyedObject(input) || Object.values(input).includes(undefined)) {
    throw new TypeError(
      'Criteria must be a non-empty object (not an array) without undefined values'
    );
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
export function assertFindAllFilter(
  criteria: unknown,
  greaterThan: unknown,
  lessThan: unknown
): void {
  if (
    !isKeyedObject(criteria) &&
    !isKeyedObject(greaterThan) &&
    !isKeyedObject(lessThan)
  ) {
    throw new TypeError(
      'findAll requires exact criteria or a range bound that selects records'
    );
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
export function isMongoDupKeyError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const code: unknown = error.code;

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
export function isMySqlDupKeyError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code: unknown = 'code' in error ? error.code : undefined;
  const errno: unknown = 'errno' in error ? error.errno : undefined;

  return code === 'ER_DUP_ENTRY' || errno === 1062;
}

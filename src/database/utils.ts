/**
 * Backend-neutral message for unique constraint violations.
 */
export const DUPLICATE_KEY_ERROR_MESSAGE: string =
  'New record conflicts with an existing unique constraint';

/**
 * Asserts criteria is a non-empty plain object (not an array) without undefined values.
 * @param input - Criteria object to validate.
 */
export function assertCriteria(input: unknown): asserts input is Record<string, unknown> {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).length === 0 ||
    Object.values(input).includes(undefined)
  ) {
    throw new TypeError(
      'Criteria must be a non-empty object (not an array) without undefined values'
    );
  }
}

/**
 * Detects MongoDB duplicate key errors.
 * @param error - Error thrown by the MongoDB driver.
 * @returns - Whether the error represents a unique constraint violation.
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
 * @param error - Error thrown by the mysql2 driver.
 * @returns - Whether the error represents a unique constraint violation.
 */
export function isMySqlDupKeyError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code: unknown = 'code' in error ? error.code : undefined;
  const errno: unknown = 'errno' in error ? error.errno : undefined;

  return code === 'ER_DUP_ENTRY' || errno === 1062;
}

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

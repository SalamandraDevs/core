/**
 * Names used to classify application errors.
 */
export type ErrorName =
  | 'API_ERROR'
  | 'CONNECTION_ERROR'
  | 'EXTERNAL_API_ERROR'
  | 'CONFIG_ERROR'
  | 'HTTP_REQUEST_ERROR'
  | 'VALIDATION_ERROR'
  | 'DB_DUPLICATE_KEY_ERROR'
  | 'MONGO_CRUD_ERROR'
  | 'MYSQL_CRUD_ERROR'
  | 'TypeError'
  | 'Error';

/**
 * Shared messages used when constructing application errors.
 */
export const errMessages: Record<string, string> = {
  DB_DUPLICATE_KEY: 'New record conflicts with an existing unique constraint'
};

/**
 * Parameters used to create a structured application error.
 */
export type ErrorParams = {
  name: ErrorName;
  message: string;
  cause?: unknown;
};

/**
 * Error with a caller-defined name and an optional underlying cause.
 *
 * The structured constructor keeps error classification and causal context
 * available through a fixed set of literal error names.
 */
export class CustomError extends Error {
  override name: ErrorName;

  /**
   * Creates a structured application error.
   * @param params - Error name, message, and optional underlying cause.
   */
  constructor(params: ErrorParams) {
    super(params.message, { cause: params.cause });
    this.name = params.name;
  }
}

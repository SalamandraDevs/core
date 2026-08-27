/**
 * Database connection lifecycle contract for one backend handle.
 */
export interface IDbConnection<THandle> {
  /**
   * Opens the database connection and returns the backend handle.
   * @returns - The connected database handle.
   */
  connect(): Promise<THandle>;

  /**
   * Closes the database connection.
   * @returns - A promise that resolves when the connection is closed.
   */
  close(): Promise<void>;
}

/**
 * Reads one soft-deleted record matching backend-neutral criteria.
 */
export type ReadDeleted<T> = (criteria: Partial<T>) => Promise<T | null>;

/**
 * Backend-neutral CRUD contract for one entity record type.
 */
export interface ICrud<T> {
  /**
   * Persists one entity record.
   * @param record - Complete entity record to store.
   * @returns - The stored entity record.
   */
  create(record: T): Promise<T>;

  /**
   * Reads one entity record matching all criteria fields.
   * @param criteria - Entity fields and values used for the lookup.
   * @returns - The matching entity record, or null when not found.
   */
  read(criteria: Partial<T>): Promise<T | null>;

  /**
   * Updates one entity record matching all criteria fields.
   * @param criteria - Entity fields and values used for the lookup.
   * @param changes - Partial entity record with fields to update.
   * @returns - The updated entity record, or null when not found.
   */
  update(criteria: Partial<T>, changes: Partial<T>): Promise<T | null>;

  /**
   * Deletes one entity record matching all criteria fields.
   * @param criteria - Entity fields and values used for the lookup.
   * @returns - The deleted entity record, or null when not found.
   */
  delete(criteria: Partial<T>): Promise<T | null>;
}

/**
 * Persistence capability required by the entity policy abstraction.
 */
export type EntityCrud<T> = ICrud<T> & {
  readDeleted: ReadDeleted<T>;
};

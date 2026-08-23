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
   * Reads one entity record by field value.
   * @param key - Entity field used for the lookup.
   * @param value - Field value to match.
   * @returns - The matching entity record, or null when not found.
   */
  read<K extends keyof T>(key: K, value: T[K]): Promise<T | null>;

  /**
   * Updates one entity record by field value.
   * @param key - Entity field used for the lookup.
   * @param value - Field value to match.
   * @param changes - Partial entity record with fields to update.
   * @returns - The updated entity record, or null when not found.
   */
  update<K extends keyof T>(key: K, value: T[K], changes: Partial<T>): Promise<T | null>;

  /**
   * Deletes one entity record by field value.
   * @param key - Entity field used for the lookup.
   * @param value - Field value to match.
   * @returns - The deleted entity record, or null when not found.
   */
  delete<K extends keyof T>(key: K, value: T[K]): Promise<T | null>;
}

import type { IDbConnection } from '../base/contracts.js';

/**
 * MySQL connection adapter for application bootstrap.
 */
export class MySqlDbConnection implements IDbConnection<unknown> {
  /**
   * Creates a MySQL connection adapter for one database.
   * @param uri - MySQL connection string.
   * @param databaseName - Database name to select after connecting.
   */
  constructor(
    private readonly uri: string,
    private readonly databaseName: string
  ) {
    void uri;
    void databaseName;
  }

  /**
   * Opens the MySQL connection and returns the backend handle.
   * @returns - Connected MySQL backend handle.
   */
  connect(): Promise<unknown> {
    return Promise.reject(
      new Error('ponytail: scaffold only; implement MySQL connect later')
    );
  }

  /**
   * Closes the MySQL connection.
   * @returns - A promise that resolves when the connection is closed.
   */
  close(): Promise<void> {
    return Promise.reject(
      new Error('ponytail: scaffold only; implement MySQL close later')
    );
  }
}

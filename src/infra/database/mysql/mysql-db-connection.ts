import { createPool } from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

import type { IDbConnection } from '../contracts.js';

/**
 * MySQL connection adapter for application bootstrap.
 * @remarks
 * `connect` creates the pool and issues a `SELECT 1` so a connection failure surfaces
 * during bootstrap rather than on the first query; `close` ends the pool and is a no-op
 * when never connected. {@link DatabaseProvider} owns its lifecycle.
 * @group Infra
 * @category Database
 */
export class MySqlDbConnection implements IDbConnection<Pool> {
  /** Backend discriminant that tags this connection as the MySQL vendor. */
  readonly backend = 'mysql' as const;

  private pool: Pool | null = null;

  /**
   * Creates a MySQL connection adapter for one database.
   * @param uri - MySQL connection string.
   * @param databaseName - Database name to select after connecting.
   */
  constructor(
    private readonly uri: string,
    private readonly databaseName: string
  ) {}

  /**
   * Opens the MySQL connection and returns the backend handle.
   * @returns Connected MySQL backend handle.
   */
  async connect(): Promise<Pool> {
    this.pool = createPool({
      uri: this.uri,
      database: this.databaseName
    });

    await this.pool.query('SELECT 1');

    return this.pool;
  }

  /**
   * Closes the MySQL connection.
   * @returns A promise that resolves when the connection is closed.
   */
  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.end();
    this.pool = null;
  }
}

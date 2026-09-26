import { CustomError } from '@slmdevs/tools/shared';
import type { Db } from 'mongodb';
import type { Pool } from 'mysql2/promise';

import { MongoDbConnection } from './mongo/mongo-db-connection.js';
import { MySqlDbConnection } from './mysql/mysql-db-connection.js';
import type { IDatabaseProvider } from './contracts.js';
import type { DatabaseBackend, DatabaseHandle } from './types.js';

/**
 * Backend-neutral database provider that owns one connection lifecycle.
 */
export class DatabaseProvider implements IDatabaseProvider {
  readonly #connection: MongoDbConnection | MySqlDbConnection;
  #handle: DatabaseHandle | null = null;

  /**
   * Creates a provider bound to one backend connection.
   * @param backend - Backend adapter family to connect to.
   * @param uri - Database connection string.
   * @param databaseName - Database name selected after connecting.
   */
  constructor(
    public readonly backend: DatabaseBackend,
    uri: string,
    databaseName: string
  ) {
    this.#connection =
      backend === 'mysql'
        ? new MySqlDbConnection(uri, databaseName)
        : new MongoDbConnection(uri, databaseName);
  }

  /**
   * Opens the underlying connection and caches its backend-tagged handle.
   * @returns The connected database handle.
   */
  async connect(): Promise<DatabaseHandle> {
    if (this.#connection instanceof MySqlDbConnection) {
      const pool: Pool = await this.#connection.connect();

      this.#handle = { backend: 'mysql', pool };

      return this.#handle;
    }

    const db: Db = await this.#connection.connect();

    this.#handle = { backend: 'mongodb', db };

    return this.#handle;
  }

  /**
   * Returns the connected, backend-tagged database handle.
   * @returns Connected database handle.
   */
  getHandle(): DatabaseHandle {
    if (!this.#handle) {
      throw new CustomError({
        name: 'DB_ADAPTER_ERROR',
        message: 'Database provider connection has not been opened'
      });
    }

    return this.#handle;
  }

  /**
   * Closes the underlying database connection.
   * @returns A promise that resolves when the connection is closed.
   */
  async close(): Promise<void> {
    await this.#connection.close();
  }
}

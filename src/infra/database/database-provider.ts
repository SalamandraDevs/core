import { CustomError } from '@salamandradevs/tools/shared';

import { MongoDbConnection } from './mongo/mongo-db-connection.js';
import { MySqlDbConnection } from './mysql/mysql-db-connection.js';
import type { IDatabaseProvider } from './contracts.js';
import type { DatabaseBackend, DatabaseHandle } from './types.js';

/**
 * Backend-neutral database provider that owns one connection lifecycle.
 *
 * @remarks
 * Selects a MongoDB, MySQL, or future-vendor connection from the `backend` argument,
 * but opens nothing; `connect` establishes the connection and caches the
 * backend-tagged {@link DatabaseHandle} that {@link DatabaseAdapter} consumes. One
 * provider owns one connection, so a composition root closes it once during shutdown.
 * @group Infra
 * @category Database
 */
export class DatabaseProvider implements IDatabaseProvider {
  private readonly connection: MongoDbConnection | MySqlDbConnection;
  private handle: DatabaseHandle | null = null;

  /**
   * Creates a provider bound to one backend connection.
   *
   * @param backend - Backend adapter family to connect to.
   * @param uri - Database connection string.
   * @param databaseName - Database name selected after connecting.
   * @throws {CustomError} DB_BACKEND_ERROR when `backend` names an unsupported vendor.
   */
  constructor(
    public readonly backend: DatabaseBackend,
    uri: string,
    databaseName: string
  ) {
    // The backend discriminant selects the connection vendor once; adding a backend to
    // DatabaseBackend without a case here fails the `never` exhaustiveness check.
    switch (backend) {
      case 'mysql': {
        this.connection = new MySqlDbConnection(uri, databaseName);

        break;
      }

      case 'mongodb': {
        this.connection = new MongoDbConnection(uri, databaseName);

        break;
      }

      default: {
        const unsupported: never = backend;

        throw new CustomError({
          name: 'DB_BACKEND_ERROR',
          message: `Unsupported database backend: ${String(unsupported)}`
        });
      }
    }
  }

  /**
   * Opens the underlying connection and caches its backend-tagged handle.
   *
   * @remarks
   * The connection's `backend` discriminant narrows it to one driver, so the raw handle is
   * tagged with its `backend` and cached without inspecting the driver. Adding a backend
   * without a matching `case` fails the `never` exhaustiveness check. Calling it again
   * reconnects and replaces the cached handle.
   * @returns The connected database handle.
   */
  async connect(): Promise<DatabaseHandle> {
    switch (this.connection.backend) {
      case 'mysql': {
        this.handle = { backend: 'mysql', pool: await this.connection.connect() };

        break;
      }

      case 'mongodb': {
        this.handle = { backend: 'mongodb', db: await this.connection.connect() };

        break;
      }

      default: {
        const unsupported: never = this.connection;

        throw new CustomError({
          name: 'DB_BACKEND_ERROR',
          message: `Unsupported database backend: ${String(unsupported)}`
        });
      }
    }

    return this.handle;
  }

  /**
   * Returns the connected, backend-tagged database handle.
   *
   * @returns Connected database handle.
   * @throws {CustomError} DB_BACKEND_ERROR when called before
   *   {@link DatabaseProvider.connect}.
   */
  getHandle(): DatabaseHandle {
    if (!this.handle) {
      throw new CustomError({
        name: 'DB_BACKEND_ERROR',
        message: 'Database provider connection has not been opened'
      });
    }

    return this.handle;
  }

  /**
   * Closes the underlying database connection.
   *
   * @returns A promise that resolves when the connection is closed.
   */
  async close(): Promise<void> {
    await this.connection.close();
  }
}

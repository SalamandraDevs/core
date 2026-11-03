import { MongoClient, type Db } from 'mongodb';
import { CustomError } from '@salamandradevs/tools/shared';

import type { IDbConnection } from '../contracts.js';

/**
 * MongoDB connection adapter for application bootstrap.
 *
 * @remarks
 * The constructor builds the `MongoClient` but opens nothing; `connect` establishes the
 * connection and selects the configured database, and `close` releases the client.
 * {@link DatabaseProvider} owns its lifecycle.
 * @group Infra
 * @category Database
 */
export class MongoDbConnection implements IDbConnection<Db> {
  /** Backend discriminant that tags this connection as the MongoDB vendor. */
  readonly backend = 'mongodb' as const;

  private readonly client: MongoClient;

  /**
   * Creates a Mongo connection adapter for one database.
   *
   * @param uri - Mongo connection string.
   * @param dbName - Database name to select after connecting.
   */
  constructor(
    private readonly uri: string,
    private readonly dbName: string
  ) {
    this.client = new MongoClient(uri);
  }

  /**
   * Opens the Mongo connection and returns the database handle.
   *
   * @returns Connected Mongo database handle.
   * @throws {CustomError} DB_BACKEND_ERROR when the server is unreachable or rejects the
   *   connection; the driver error is kept as the cause.
   */
  async connect(): Promise<Db> {
    try {
      await this.client.connect();
    } catch (error: unknown) {
      throw new CustomError({
        name: 'DB_BACKEND_ERROR',
        message: 'MongoDB connection failed',
        cause: error
      });
    }

    return this.client.db(this.dbName);
  }

  /**
   * Closes the Mongo client connection.
   *
   * @returns A promise that resolves when the client is closed.
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}

import { MongoClient, type Db } from 'mongodb';

import type { IDbConnection } from '../contracts.js';

/**
 * MongoDB connection adapter for application bootstrap.
 */
export class MongoDbConnection implements IDbConnection<Db> {
  readonly #client: MongoClient;

  /**
   * Creates a Mongo connection adapter for one database.
   * @param uri - Mongo connection string.
   * @param dbName - Database name to select after connecting.
   */
  constructor(
    private readonly uri: string,
    private readonly dbName: string
  ) {
    this.#client = new MongoClient(uri);
  }

  /**
   * Opens the Mongo connection and returns the database handle.
   * @returns - Connected Mongo database handle.
   */
  async connect(): Promise<Db> {
    await this.#client.connect();
    return this.#client.db(this.dbName);
  }

  /**
   * Closes the Mongo client connection.
   * @returns - A promise that resolves when the client is closed.
   */
  async close(): Promise<void> {
    await this.#client.close();
  }
}

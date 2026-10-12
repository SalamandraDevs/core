import { type Db } from 'mongodb';
import type { IDbConnection } from '../contracts.js';
/**
 * MongoDB connection adapter for application bootstrap.
 * @remarks
 * The constructor builds the `MongoClient` but opens nothing; `connect` establishes the
 * connection and selects the configured database, and `close` releases the client.
 * {@link DatabaseProvider} owns its lifecycle.
 * @group Infra
 * @category Database
 */
export declare class MongoDbConnection implements IDbConnection<Db> {
    private readonly uri;
    private readonly dbName;
    /** Backend discriminant that tags this connection as the MongoDB vendor. */
    readonly backend: "mongodb";
    private readonly client;
    /**
     * Creates a Mongo connection adapter for one database.
     * @param uri - Mongo connection string.
     * @param dbName - Database name to select after connecting.
     */
    constructor(uri: string, dbName: string);
    /**
     * Opens the Mongo connection and returns the database handle.
     * @returns Connected Mongo database handle.
     */
    connect(): Promise<Db>;
    /**
     * Closes the Mongo client connection.
     * @returns A promise that resolves when the client is closed.
     */
    close(): Promise<void>;
}
//# sourceMappingURL=mongo-db-connection.d.ts.map
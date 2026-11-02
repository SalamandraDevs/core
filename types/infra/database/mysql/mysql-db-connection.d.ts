import type { Pool } from 'mysql2/promise';
import type { IDbConnection } from '../contracts.js';
/**
 * MySQL connection adapter for application bootstrap.
 *
 * @remarks
 * `connect` creates the pool and issues a `SELECT 1` so a connection failure surfaces
 * during bootstrap rather than on the first query; `close` ends the pool and is a no-op
 * when never connected. {@link DatabaseProvider} owns its lifecycle.
 * @group Infra
 * @category Database
 */
export declare class MySqlDbConnection implements IDbConnection<Pool> {
    private readonly uri;
    private readonly databaseName;
    /** Backend discriminant that tags this connection as the MySQL vendor. */
    readonly backend: "mysql";
    private pool;
    /**
     * Creates a MySQL connection adapter for one database.
     *
     * @param uri - MySQL connection string.
     * @param databaseName - Database name to select after connecting.
     */
    constructor(uri: string, databaseName: string);
    /**
     * Opens the MySQL connection and returns the backend handle.
     *
     * @returns Connected MySQL backend handle.
     */
    connect(): Promise<Pool>;
    /**
     * Closes the MySQL connection.
     *
     * @returns A promise that resolves when the connection is closed.
     */
    close(): Promise<void>;
}
//# sourceMappingURL=mysql-db-connection.d.ts.map
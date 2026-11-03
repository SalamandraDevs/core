import { createPool } from 'mysql2/promise';
import { CustomError } from '@salamandradevs/tools/shared';
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
export class MySqlDbConnection {
    uri;
    databaseName;
    /** Backend discriminant that tags this connection as the MySQL vendor. */
    backend = 'mysql';
    pool = null;
    /**
     * Creates a MySQL connection adapter for one database.
     *
     * @param uri - MySQL connection string.
     * @param databaseName - Database name to select after connecting.
     */
    constructor(uri, databaseName) {
        this.uri = uri;
        this.databaseName = databaseName;
    }
    /**
     * Opens the MySQL connection and returns the backend handle.
     *
     * @returns Connected MySQL backend handle.
     * @throws {CustomError} DB_BACKEND_ERROR when the server is unreachable or rejects the
     *   connection; the driver error is kept as the cause.
     */
    async connect() {
        this.pool = createPool({
            uri: this.uri,
            database: this.databaseName
        });
        // `createPool` opens nothing; the probe query is the first network call, so it is the
        // point where an unreachable server or a rejected login surfaces.
        try {
            await this.pool.query('SELECT 1');
        }
        catch (error) {
            throw new CustomError({
                name: 'DB_BACKEND_ERROR',
                message: 'MySQL connection failed',
                cause: error
            });
        }
        return this.pool;
    }
    /**
     * Closes the MySQL connection.
     *
     * @returns A promise that resolves when the connection is closed.
     */
    async close() {
        if (!this.pool) {
            return;
        }
        await this.pool.end();
        this.pool = null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXlzcWwtZGItY29ubmVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9teXNxbC9teXNxbC1kYi1jb25uZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFLM0Q7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQWFUO0lBQ0E7SUFibkIsMEVBQTBFO0lBQ2pFLE9BQU8sR0FBRyxPQUFnQixDQUFDO0lBRTVCLElBQUksR0FBZ0IsSUFBSSxDQUFDO0lBRWpDOzs7OztPQUtHO0lBQ0gsWUFDbUIsR0FBVyxFQUNYLFlBQW9CO1FBRHBCLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUNwQyxDQUFDO0lBRUo7Ozs7OztPQU1HO0lBQ0gsS0FBSyxDQUFDLE9BQU87UUFDWCxJQUFJLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztZQUNyQixHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVk7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsc0ZBQXNGO1FBQ3RGLGtFQUFrRTtRQUNsRSxJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFBQyxPQUFPLEtBQWMsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxXQUFXLENBQUM7Z0JBQ3BCLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLE9BQU8sRUFBRSx5QkFBeUI7Z0JBQ2xDLEtBQUssRUFBRSxLQUFLO2FBQ2IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxLQUFLO1FBQ1QsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNmLE9BQU87UUFDVCxDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7Q0FDRiJ9
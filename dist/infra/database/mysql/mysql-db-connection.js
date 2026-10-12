import { createPool } from 'mysql2/promise';
/**
 * MySQL connection adapter for application bootstrap.
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
     * @param uri - MySQL connection string.
     * @param databaseName - Database name to select after connecting.
     */
    constructor(uri, databaseName) {
        this.uri = uri;
        this.databaseName = databaseName;
    }
    /**
     * Opens the MySQL connection and returns the backend handle.
     * @returns Connected MySQL backend handle.
     */
    async connect() {
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
    async close() {
        if (!this.pool) {
            return;
        }
        await this.pool.end();
        this.pool = null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXlzcWwtZGItY29ubmVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9teXNxbC9teXNxbC1kYi1jb25uZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUs1Qzs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFZVDtJQUNBO0lBWm5CLDBFQUEwRTtJQUNqRSxPQUFPLEdBQUcsT0FBZ0IsQ0FBQztJQUU1QixJQUFJLEdBQWdCLElBQUksQ0FBQztJQUVqQzs7OztPQUlHO0lBQ0gsWUFDbUIsR0FBVyxFQUNYLFlBQW9CO1FBRHBCLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUNwQyxDQUFDO0lBRUo7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLE9BQU87UUFDWCxJQUFJLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztZQUNyQixHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVk7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVsQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbkIsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxLQUFLO1FBQ1QsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNmLE9BQU87UUFDVCxDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7Q0FDRiJ9
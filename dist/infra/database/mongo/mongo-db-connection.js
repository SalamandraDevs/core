import { MongoClient } from 'mongodb';
import { CustomError } from '@salamandradevs/tools/shared';
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
export class MongoDbConnection {
    uri;
    dbName;
    /** Backend discriminant that tags this connection as the MongoDB vendor. */
    backend = 'mongodb';
    client;
    /**
     * Creates a Mongo connection adapter for one database.
     *
     * @param uri - Mongo connection string.
     * @param dbName - Database name to select after connecting.
     */
    constructor(uri, dbName) {
        this.uri = uri;
        this.dbName = dbName;
        this.client = new MongoClient(uri);
    }
    /**
     * Opens the Mongo connection and returns the database handle.
     *
     * @returns Connected Mongo database handle.
     * @throws {CustomError} DB_BACKEND_ERROR when the server is unreachable or rejects the
     *   connection; the driver error is kept as the cause.
     */
    async connect() {
        try {
            await this.client.connect();
        }
        catch (error) {
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
    async close() {
        await this.client.close();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28tZGItY29ubmVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9tb25nby9tb25nby1kYi1jb25uZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQVcsTUFBTSxTQUFTLENBQUM7QUFDL0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBSTNEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFhVDtJQUNBO0lBYm5CLDRFQUE0RTtJQUNuRSxPQUFPLEdBQUcsU0FBa0IsQ0FBQztJQUVyQixNQUFNLENBQWM7SUFFckM7Ozs7O09BS0c7SUFDSCxZQUNtQixHQUFXLEVBQ1gsTUFBYztRQURkLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBRS9CLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILEtBQUssQ0FBQyxPQUFPO1FBQ1gsSUFBSSxDQUFDO1lBQ0gsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzlCLENBQUM7UUFBQyxPQUFPLEtBQWMsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxXQUFXLENBQUM7Z0JBQ3BCLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLE9BQU8sRUFBRSwyQkFBMkI7Z0JBQ3BDLEtBQUssRUFBRSxLQUFLO2FBQ2IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLEtBQUs7UUFDVCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDNUIsQ0FBQztDQUNGIn0=
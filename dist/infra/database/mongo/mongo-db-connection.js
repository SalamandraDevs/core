import { MongoClient } from 'mongodb';
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
     */
    async connect() {
        await this.client.connect();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28tZGItY29ubmVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9pbmZyYS9kYXRhYmFzZS9tb25nby9tb25nby1kYi1jb25uZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxXQUFXLEVBQVcsTUFBTSxTQUFTLENBQUM7QUFJL0M7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQWFUO0lBQ0E7SUFibkIsNEVBQTRFO0lBQ25FLE9BQU8sR0FBRyxTQUFrQixDQUFDO0lBRXJCLE1BQU0sQ0FBYztJQUVyQzs7Ozs7T0FLRztJQUNILFlBQ21CLEdBQVcsRUFDWCxNQUFjO1FBRGQsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLFdBQU0sR0FBTixNQUFNLENBQVE7UUFFL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxPQUFPO1FBQ1gsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLEtBQUs7UUFDVCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDNUIsQ0FBQztDQUNGIn0=
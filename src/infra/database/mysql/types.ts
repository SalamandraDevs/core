/**
 * MySQL schema definition produced from Zod conversion.
 * - ddl: Column and constraint DDL spliced into a `CREATE TABLE` statement.
 * @remarks
 * The backend schema format the {@link SchemaConverter} yields for MySQL and {@link MySqlDataset}
 * consumes when creating a table.
 * @group Database
 * @category Database
 */
export type MySqlSchema = {
  ddl: string;
};

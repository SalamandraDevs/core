import type { DatasetDef } from '../types.js';

export type { MongoJSONSchema } from '@slmdevs/tools/shared';

/**
 * Mongo dataset definition consumed by provisioning workflows.
 * @remarks
 * The MongoDB specialization of {@link DatasetDef}, kept as a named alias so Mongo call sites
 * read intently even though it currently matches the default definition.
 * @group Database
 * @category Database
 */
export type MongoDatasetDef = DatasetDef;

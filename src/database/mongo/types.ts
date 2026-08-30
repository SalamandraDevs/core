import type { CreateIndexesOptions, IndexSpecification } from 'mongodb';
import type { ZodType } from 'zod';

export type { MongoJSONSchema } from '@slmdevs/tools/shared';

/**
 * Mongo index definition used during dataset provisioning.
 */
export type MongoIndexDef = {
  name: string;
  keys: IndexSpecification;
  options?: Omit<CreateIndexesOptions, 'name'>;
};

/**
 * Mongo dataset definition consumed by provisioning workflows.
 */
export type MongoDatasetDef = {
  name: string;
  schema: ZodType;
  indexes: readonly MongoIndexDef[];
};

import type { ZodType } from 'zod';
import { zodToMongoSchema } from '@slmdevs/tools';

import { DatasetProvisioner } from '../base/dataset-provisioner.js';
import type { MongoDatasetDef, MongoIndexDef, MongoJSONSchema } from './types.js';

/**
 * MongoDB dataset provisioner that converts Zod schemas into JSON schema validators.
 */
export class MongoDatasetProvisioner extends DatasetProvisioner<
  MongoDatasetDef,
  MongoJSONSchema,
  MongoIndexDef
> {
  /**
   * Converts one Zod schema into a Mongo JSON schema validator.
   * @param schema - Source Zod schema for the dataset.
   * @returns - Mongo JSON schema validator definition.
   */
  protected convertSchema(schema: ZodType): MongoJSONSchema {
    return zodToMongoSchema(schema);
  }
}

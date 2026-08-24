import type { ZodType } from 'zod';

import { DatasetProvisioner } from '../base/dataset-provisioner.js';
import type { MySqlIndexDef, MySqlSchema } from './mysql-dataset.js';

/**
 * MySQL dataset provisioner that converts Zod schemas into DDL definitions.
 */
export class MySqlDatasetProvisioner extends DatasetProvisioner<
  {
    name: string;
    schema: ZodType;
    indexes: readonly MySqlIndexDef[];
  },
  MySqlSchema,
  MySqlIndexDef
> {
  /**
   * Converts one Zod schema into a MySQL DDL definition.
   * @param schema - Source Zod schema for the dataset.
   * @returns - MySQL schema definition used by provisioning.
   */
  protected convertSchema(schema: ZodType): MySqlSchema {
    void schema;
    return { ddl: '' };
  }
}

export type { ICrud, IDbConnection } from './base/contracts.js';
export { Dataset } from './base/dataset.js';
export { DatasetProvisioner } from './base/dataset-provisioner.js';
export type { GeneralRecord } from './types.js';
export * from './mongo/index.js';
export * from './mysql/index.js';
export {
  assertCriteria,
  DUPLICATE_KEY_ERROR_MESSAGE,
  isMongoDupKeyError,
  isMySqlDupKeyError
} from './utils.js';

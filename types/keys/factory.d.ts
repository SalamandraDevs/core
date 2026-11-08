import type { IKeysProvider } from './contracts.js';
import type { SigningKeysConfig } from './config/types.js';
/**
 * Selects and constructs the keys provider named by `SIGNING_KEY_PROVIDER`.
 *
 * @remarks
 * Construction only: each provider resolves its own environment as it is constructed but
 * performs no input or output, so all network and file work is deferred to `initialize()`.
 * The `switch` is the single extension point; a new provider is a new enum member, a new
 * `case`, and its own configuration block, with no change to the bootstrap step or the
 * services that consume the provider. Returns the owner of the key set as
 * {@link IKeysProvider}; the composition root hands each consumer only the role it uses.
 * @group Keys
 * @category Key Providers
 * @param config - Signing lifecycle and per-provider configuration.
 * @returns The keys provider named by `SIGNING_KEY_PROVIDER`, ready for `initialize()`.
 * @throws {CustomError} ENV_VAR_ERROR when `SIGNING_KEY_PROVIDER` is missing or not a
 *   recognized provider, or (for OpenBao) when the provider's own variables are missing.
 * @throws {CustomError} CONFIG_ERROR when the selected provider has no configuration block.
 */
export declare function createKeysProvider(config: SigningKeysConfig): IKeysProvider;
//# sourceMappingURL=factory.d.ts.map
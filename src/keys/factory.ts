import { CustomError } from '@salamandradevs/tools/shared';
import { loadEnvVariables } from '@salamandradevs/tools/node';

import { OpenBaoKeysProvider } from './openbao/index.js';
import { JoseKeysProvider } from './jose/index.js';
import { signingKeyProviderSchema } from './config/schema.js';
import { signingKeyProviderSelectorSchema } from './config/schema.js';
import type { IKeysProvider } from './contracts.js';
import type { SigningKeyProvider } from './config/types.js';
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
export function createKeysProvider(config: SigningKeysConfig): IKeysProvider {
  const selector: Record<string, string> = loadEnvVariables(
    signingKeyProviderSelectorSchema
  );

  // loadEnvVariables validates the value but widens it to `string`; re-read it through the
  // enum to recover the literal type the exhaustive `switch` below relies on.
  const provider: SigningKeyProvider = signingKeyProviderSchema.parse(selector.provider);

  switch (provider) {
    case 'openbao': {
      if (!config.openbao) {
        throw new CustomError({
          name: 'CONFIG_ERROR',
          message:
            'SIGNING_KEY_PROVIDER is openbao but signingKeys.openbao is not configured'
        });
      }

      // The provider reads its own environment from the variables its config names, so this
      // factory composes it from configuration alone and never handles the origin or token.
      return new OpenBaoKeysProvider(
        config.openbao,
        config.algorithm,
        config.openbao.refreshCooldownSecs
      );
    }

    case 'jose': {
      if (!config.jose) {
        throw new CustomError({
          name: 'CONFIG_ERROR',
          message: 'SIGNING_KEY_PROVIDER is jose but signingKeys.jose is not configured'
        });
      }

      return new JoseKeysProvider(config.jose, config.algorithm);
    }

    default: {
      // Exhaustiveness: adding a provider to the enum without a case here fails to compile.
      const unknownProvider: never = provider;

      throw new CustomError({
        name: 'CONFIG_ERROR',
        message: `Unhandled signing-key provider: ${String(unknownProvider)}`
      });
    }
  }
}

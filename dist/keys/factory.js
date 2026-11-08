import { CustomError } from '@salamandradevs/tools/shared';
import { loadEnvVariables } from '@salamandradevs/tools/node';
import { OpenBaoKeysProvider } from './openbao/index.js';
import { JoseKeysProvider } from './jose/index.js';
import { signingKeyProviderSchema } from './config/schema.js';
import { signingKeyProviderSelectorSchema } from './config/schema.js';
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
export function createKeysProvider(config) {
    const selector = loadEnvVariables(signingKeyProviderSelectorSchema);
    // loadEnvVariables validates the value but widens it to `string`; re-read it through the
    // enum to recover the literal type the exhaustive `switch` below relies on.
    const provider = signingKeyProviderSchema.parse(selector.provider);
    switch (provider) {
        case 'openbao': {
            if (!config.openbao) {
                throw new CustomError({
                    name: 'CONFIG_ERROR',
                    message: 'SIGNING_KEY_PROVIDER is openbao but signingKeys.openbao is not configured'
                });
            }
            // The provider reads its own environment from the variables its config names, so this
            // factory composes it from configuration alone and never handles the origin or token.
            return new OpenBaoKeysProvider(config.openbao, config.algorithm, config.openbao.refreshCooldownSecs);
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
            const unknownProvider = provider;
            throw new CustomError({
                name: 'CONFIG_ERROR',
                message: `Unhandled signing-key provider: ${String(unknownProvider)}`
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9rZXlzL2ZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRTlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ25ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBS3RFOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRztBQUNILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxNQUF5QjtJQUMxRCxNQUFNLFFBQVEsR0FBMkIsZ0JBQWdCLENBQ3ZELGdDQUFnQyxDQUNqQyxDQUFDO0lBRUYseUZBQXlGO0lBQ3pGLDRFQUE0RTtJQUM1RSxNQUFNLFFBQVEsR0FBdUIsd0JBQXdCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV2RixRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2pCLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3BCLE1BQU0sSUFBSSxXQUFXLENBQUM7b0JBQ3BCLElBQUksRUFBRSxjQUFjO29CQUNwQixPQUFPLEVBQ0wsMkVBQTJFO2lCQUM5RSxDQUFDLENBQUM7WUFDTCxDQUFDO1lBRUQsc0ZBQXNGO1lBQ3RGLHNGQUFzRjtZQUN0RixPQUFPLElBQUksbUJBQW1CLENBQzVCLE1BQU0sQ0FBQyxPQUFPLEVBQ2QsTUFBTSxDQUFDLFNBQVMsRUFDaEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FDbkMsQ0FBQztRQUNKLENBQUM7UUFFRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDWixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNqQixNQUFNLElBQUksV0FBVyxDQUFDO29CQUNwQixJQUFJLEVBQUUsY0FBYztvQkFDcEIsT0FBTyxFQUFFLHFFQUFxRTtpQkFDL0UsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNSLHNGQUFzRjtZQUN0RixNQUFNLGVBQWUsR0FBVSxRQUFRLENBQUM7WUFFeEMsTUFBTSxJQUFJLFdBQVcsQ0FBQztnQkFDcEIsSUFBSSxFQUFFLGNBQWM7Z0JBQ3BCLE9BQU8sRUFBRSxtQ0FBbUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFO2FBQ3RFLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0FBQ0gsQ0FBQyJ9
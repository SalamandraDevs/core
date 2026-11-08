import { z } from 'zod';
import { openBaoSigningKeysConfigSchema } from '../openbao/schema.js';
import { joseSigningKeysConfigSchema } from '../jose/schema.js';
/**
 * Supported signing-key provider identifiers; grows as new providers are added.
 *
 * @group Keys
 * @category Key Providers
 */
export const signingKeyProviderSchema = z.enum(['jose', 'openbao']);
/**
 * Signing-key provider selector resolved from the environment.
 *
 * - Provider: Active signing-key provider; read from `SIGNING_KEY_PROVIDER`.
 *
 * @remarks
 * `provider` is marked `.meta({ env })`, so `loadEnvVariables` resolves it from
 * `SIGNING_KEY_PROVIDER`; the active provider is chosen at runtime, never baked into the
 * configuration file.
 * @group Keys
 * @category Key Providers
 */
export const signingKeyProviderSelectorSchema = z
    .object({
    provider: signingKeyProviderSchema.meta({ env: 'SIGNING_KEY_PROVIDER' })
})
    .strict();
/**
 * Provider-neutral signing lifecycle schema.
 *
 * - Algorithm: JOSE algorithm supported by this key set.
 * - Jose: Jose provider configuration, present when the deployment may select `jose`.
 * - Openbao: OpenBao provider configuration, present when the deployment may select
 *   `openbao`.
 *
 * @remarks
 * Each provider block is optional so a deployment configures only the providers it uses;
 * the active one is chosen at runtime by `SIGNING_KEY_PROVIDER` and must have its block
 * present. Composed into each service's own `serviceConfigSchema` and validated there; core
 * never reads a configuration file.
 * @group Keys
 * @category Key Providers
 */
export const signingKeysConfigSchema = z
    .object({
    algorithm: z.literal('ES256'),
    jose: joseSigningKeysConfigSchema.optional(),
    openbao: openBaoSigningKeysConfigSchema.optional()
})
    .strict();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2tleXMvY29uZmlnL3NjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sS0FBSyxDQUFDO0FBRXhCLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRWhFOzs7OztHQUtHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBRXBFOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsQ0FBQztLQUM5QyxNQUFNLENBQUM7SUFDTixRQUFRLEVBQUUsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLHNCQUFzQixFQUFFLENBQUM7Q0FDekUsQ0FBQztLQUNELE1BQU0sRUFBRSxDQUFDO0FBRVo7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQztLQUNyQyxNQUFNLENBQUM7SUFDTixTQUFTLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7SUFDN0IsSUFBSSxFQUFFLDJCQUEyQixDQUFDLFFBQVEsRUFBRTtJQUM1QyxPQUFPLEVBQUUsOEJBQThCLENBQUMsUUFBUSxFQUFFO0NBQ25ELENBQUM7S0FDRCxNQUFNLEVBQUUsQ0FBQyJ9
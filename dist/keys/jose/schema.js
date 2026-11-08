import { z } from 'zod';
import { signingKeyStateSchema } from '../schema.js';
/**
 * Jose key-file storage schema.
 *
 * - FilePath: Path to the encrypted key file; must be listed in `.gitignore`.
 * - Passphrase: Encrypted key-file passphrase; a secret, read from `JOSE_KEYFILE_PASSPHRASE`.
 *
 * @remarks
 * `passphrase` is marked `.meta({ env })`, so `loadEnvVariables` resolves it from
 * `JOSE_KEYFILE_PASSPHRASE`; the configuration file holds only a placeholder.
 */
export const joseStorageConfigSchema = z
    .object({
    filePath: z.string().min(1),
    passphrase: z
        .string({ error: 'is required' })
        .min(1, 'must not be empty')
        .meta({ env: 'JOSE_KEYFILE_PASSPHRASE' })
})
    .strict();
/**
 * Jose provider configuration and local-storage schema.
 *
 * - KeyNamePrefix: Prefix for the generated `kid` and provider key identifier.
 * - Storage: Encrypted key-file location and passphrase source.
 *
 * @remarks
 * Self-contained so the provider directory owns its whole storage story without the factory
 * ever handling a file path or a secret.
 */
export const joseSigningKeysConfigSchema = z
    .object({
    keyNamePrefix: z.string().min(1),
    storage: joseStorageConfigSchema
})
    .strict();
/**
 * EC P-256 private JWK persisted in the encrypted key file.
 *
 * - Kty: Key type, always `EC`.
 * - Crv: Curve, always `P-256`.
 * - X: Public x coordinate.
 * - Y: Public y coordinate.
 * - D: Private scalar; the secret half, which is why the file is encrypted at rest.
 */
export const privateJwkSchema = z
    .object({
    kty: z.literal('EC'),
    crv: z.literal('P-256'),
    x: z.string().min(1),
    y: z.string().min(1),
    d: z.string().min(1)
})
    .strict();
/**
 * Decrypted key-file payload.
 *
 * - State: Signing-key lifecycle document shared with every provider.
 * - PrivateJwks: Private signing material indexed by `kid`.
 */
export const keyFilePayloadSchema = z
    .object({
    state: signingKeyStateSchema,
    privateJwks: z.record(z.string().min(1), privateJwkSchema)
})
    .strict();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2tleXMvam9zZS9zY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUV4QixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFckQ7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQztLQUNyQyxNQUFNLENBQUM7SUFDTixRQUFRLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDM0IsVUFBVSxFQUFFLENBQUM7U0FDVixNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUM7U0FDaEMsR0FBRyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsQ0FBQztTQUMzQixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUseUJBQXlCLEVBQUUsQ0FBQztDQUM1QyxDQUFDO0tBQ0QsTUFBTSxFQUFFLENBQUM7QUFFWjs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxDQUFDO0tBQ3pDLE1BQU0sQ0FBQztJQUNOLGFBQWEsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNoQyxPQUFPLEVBQUUsdUJBQXVCO0NBQ2pDLENBQUM7S0FDRCxNQUFNLEVBQUUsQ0FBQztBQUVaOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQztLQUM5QixNQUFNLENBQUM7SUFDTixHQUFHLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7SUFDcEIsR0FBRyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ3ZCLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNwQixDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0NBQ3JCLENBQUM7S0FDRCxNQUFNLEVBQUUsQ0FBQztBQUVaOzs7OztHQUtHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQztLQUNsQyxNQUFNLENBQUM7SUFDTixLQUFLLEVBQUUscUJBQXFCO0lBQzVCLFdBQVcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUM7Q0FDM0QsQ0FBQztLQUNELE1BQU0sRUFBRSxDQUFDIn0=
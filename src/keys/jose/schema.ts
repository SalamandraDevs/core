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

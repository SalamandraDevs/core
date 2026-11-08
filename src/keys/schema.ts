import { z } from 'zod';

/**
 * Public JSON Web Key material schema.
 *
 * - Kty: Key type.
 * - Kid: Public key identifier.
 * - Use: Optional intended key use.
 * - Alg: Optional JOSE algorithm.
 * - Crv: Optional elliptic curve name.
 * - X: Optional elliptic-curve or RSA coordinate.
 * - Y: Optional elliptic-curve coordinate.
 * - N: Optional RSA modulus.
 * - E: Optional RSA exponent.
 *
 * @remarks
 * Provider-neutral: this is the public key as served to every key consumer, so it carries
 * no provider-specific fields. Shared across every signing-key provider so each validates
 * the lifecycle document against one definition.
 * @group Keys
 * @category Key Providers
 */
export const publicJwkSchema = z
  .object({
    kty: z.string(),
    kid: z.string().min(1),
    use: z.string().optional(),
    alg: z.string().optional(),
    crv: z.string().optional(),
    x: z.string().optional(),
    y: z.string().optional(),
    n: z.string().optional(),
    e: z.string().optional()
  })
  .strict();

/**
 * Durable signing-key lifecycle document schema.
 *
 * - CurrentKid: Identifier of the sole active key.
 * - Keys: Complete provider-managed key lifecycle.
 *
 * @remarks
 * The neutral contract every provider's durable store must satisfy. Behavioural invariants
 * beyond this shape (exactly one active key, status-consistent timestamps) live in
 * {@link validateSigningKeyState}.
 * @group Keys
 * @category Key Providers
 */
export const signingKeyStateSchema = z
  .object({
    currentKid: z.string().min(1).nullable(),
    keys: z.array(
      z
        .object({
          kid: z.string().min(1),
          providerKeyId: z.string().min(1),
          status: z.enum(['pending', 'active', 'retired']),
          publicJwk: publicJwkSchema,
          activateAfter: z.string().pipe(z.iso.datetime()),
          activatedAt: z.string().pipe(z.iso.datetime()).nullable(),
          retiredAt: z.string().pipe(z.iso.datetime()).nullable(),
          verifyUntil: z.string().pipe(z.iso.datetime()).nullable()
        })
        .strict()
    )
  })
  .strict();

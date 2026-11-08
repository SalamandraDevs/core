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
    keys: z.array(z
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
        .strict())
})
    .strict();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2tleXMvc2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxLQUFLLENBQUM7QUFFeEI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkc7QUFDSCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsQ0FBQztLQUM3QixNQUFNLENBQUM7SUFDTixHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRTtJQUNmLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN0QixHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUMxQixHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUMxQixHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUMxQixDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUN4QixDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUN4QixDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUN4QixDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtDQUN6QixDQUFDO0tBQ0QsTUFBTSxFQUFFLENBQUM7QUFFWjs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxDQUFDO0tBQ25DLE1BQU0sQ0FBQztJQUNOLFVBQVUsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtJQUN4QyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FDWCxDQUFDO1NBQ0UsTUFBTSxDQUFDO1FBQ04sR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLGFBQWEsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDaEQsU0FBUyxFQUFFLGVBQWU7UUFDMUIsYUFBYSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoRCxXQUFXLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFO1FBQ3pELFNBQVMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUU7UUFDdkQsV0FBVyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRTtLQUMxRCxDQUFDO1NBQ0QsTUFBTSxFQUFFLENBQ1o7Q0FDRixDQUFDO0tBQ0QsTUFBTSxFQUFFLENBQUMifQ==
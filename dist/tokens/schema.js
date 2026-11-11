import { z } from 'zod';
/**
 * Access-token verification policy every verifier shares with the issuer.
 *
 * - Issuer: Required `iss`, the issuing service's base URL.
 * - Audience: Required `aud`.
 * - ClockToleranceSecs: Allowed clock skew when checking `exp` and `iat`.
 */
export const accessTokenVerifyConfigSchema = z
    .object({
    issuer: z.url(),
    audience: z.string().min(1),
    clockToleranceSecs: z.number().int().nonnegative()
})
    .strict();
/**
 * Platform claims carried by every access token.
 *
 * - Sid: Server-side session identifier.
 * - Sub: Authenticated subject.
 * - ActorId: Local actor represented by the session.
 * - TenantId: Tenant the session belongs to.
 * - Roles: Roles granted to the session.
 *
 * @remarks
 * Not strict: `jwtVerify` already checks the registered claims (`iss`, `aud`, `iat`,
 * `exp`), and parsing strips them.
 */
export const accessTokenClaimsSchema = z.object({
    sid: z.string(),
    sub: z.string(),
    actorId: z.string(),
    tenantId: z.string(),
    roles: z.array(z.string().min(1))
});
/** API key usage plan schema; the plan selects the tenant's rate-limit tier policy. */
export const apiKeyPlanSchema = z.enum(['platform', 'community', 'client']);
/**
 * API key wire-format policy every issuer and verifier shares.
 *
 * - Prefix: Fixed key prefix; part of the signed material, so changing it invalidates every
 *   issued key.
 * - MaxLength: Upper bound on an accepted key's character length; sheds oversized input
 *   before any decoding or crypto.
 *
 * @remarks
 * The prefix must not contain `.`, because the verifier splits the key on it, and the
 * ceiling has a floor so a typo cannot reject every real key.
 */
export const apiKeyVerifyConfigSchema = z
    .object({
    prefix: z.string().regex(/^[a-z][a-z0-9]*_$/, 'must be lowercase and end with _'),
    maxLength: z.number().int().min(256)
})
    .strict();
/**
 * Signed API key payload schema.
 *
 * - V: Payload format version.
 * - Kid: Identifier of the signing key that verifies the key.
 * - Jti: Registry `recordId` of the key.
 * - Tid: Tenant the key binds.
 * - Plan: Usage plan; selects the tenant tier policy.
 * - Exp: Expiry in Unix seconds.
 */
export const apiKeyPayloadSchema = z
    .object({
    v: z.literal(2),
    kid: z.string().min(1),
    jti: z.uuid(),
    tid: z.string().min(1),
    plan: apiKeyPlanSchema,
    exp: z.number().int().positive()
})
    .strict();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3Rva2Vucy9zY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUV4Qjs7Ozs7O0dBTUc7QUFDSCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxDQUFDO0tBQzNDLE1BQU0sQ0FBQztJQUNOLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFO0lBQ2YsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzNCLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Q0FDbkQsQ0FBQztLQUNELE1BQU0sRUFBRSxDQUFDO0FBRVo7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUM5QyxHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRTtJQUNmLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFO0lBQ2YsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUU7SUFDbkIsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUU7SUFDcEIsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUNsQyxDQUFDLENBQUM7QUFFSCx1RkFBdUY7QUFDdkYsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUU1RTs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLENBQUM7S0FDdEMsTUFBTSxDQUFDO0lBQ04sTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsa0NBQWtDLENBQUM7SUFDakYsU0FBUyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0NBQ3JDLENBQUM7S0FDRCxNQUFNLEVBQUUsQ0FBQztBQUVaOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLENBQUM7S0FDakMsTUFBTSxDQUFDO0lBQ04sQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2YsR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFO0lBQ2IsR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLElBQUksRUFBRSxnQkFBZ0I7SUFDdEIsR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDakMsQ0FBQztLQUNELE1BQU0sRUFBRSxDQUFDIn0=
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3Rva2Vucy9zY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUV4Qjs7Ozs7O0dBTUc7QUFDSCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxDQUFDO0tBQzNDLE1BQU0sQ0FBQztJQUNOLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFO0lBQ2YsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzNCLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Q0FDbkQsQ0FBQztLQUNELE1BQU0sRUFBRSxDQUFDO0FBRVo7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUM5QyxHQUFHLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRTtJQUNmLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFO0lBQ2YsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUU7SUFDbkIsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUU7SUFDcEIsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUNsQyxDQUFDLENBQUMifQ==
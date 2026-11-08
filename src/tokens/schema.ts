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

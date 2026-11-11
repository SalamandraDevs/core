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

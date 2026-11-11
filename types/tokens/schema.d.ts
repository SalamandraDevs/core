import { z } from 'zod';
/**
 * Access-token verification policy every verifier shares with the issuer.
 *
 * - Issuer: Required `iss`, the issuing service's base URL.
 * - Audience: Required `aud`.
 * - ClockToleranceSecs: Allowed clock skew when checking `exp` and `iat`.
 */
export declare const accessTokenVerifyConfigSchema: z.ZodObject<{
    issuer: z.ZodURL;
    audience: z.ZodString;
    clockToleranceSecs: z.ZodNumber;
}, z.core.$strict>;
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
export declare const accessTokenClaimsSchema: z.ZodObject<{
    sid: z.ZodString;
    sub: z.ZodString;
    actorId: z.ZodString;
    tenantId: z.ZodString;
    roles: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
/** API key usage plan schema; the plan selects the tenant's rate-limit tier policy. */
export declare const apiKeyPlanSchema: z.ZodEnum<{
    platform: "platform";
    community: "community";
    client: "client";
}>;
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
export declare const apiKeyVerifyConfigSchema: z.ZodObject<{
    prefix: z.ZodString;
    maxLength: z.ZodNumber;
}, z.core.$strict>;
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
export declare const apiKeyPayloadSchema: z.ZodObject<{
    v: z.ZodLiteral<2>;
    kid: z.ZodString;
    jti: z.ZodUUID;
    tid: z.ZodString;
    plan: z.ZodEnum<{
        platform: "platform";
        community: "community";
        client: "client";
    }>;
    exp: z.ZodNumber;
}, z.core.$strict>;
//# sourceMappingURL=schema.d.ts.map
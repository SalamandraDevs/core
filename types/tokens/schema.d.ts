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
//# sourceMappingURL=schema.d.ts.map
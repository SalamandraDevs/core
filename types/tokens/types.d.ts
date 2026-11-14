import type { z } from 'zod';
import type { accessTokenClaimsSchema } from './schema.js';
import type { accessTokenVerifyConfigSchema } from './schema.js';
import type { apiKeyPayloadSchema } from './schema.js';
import type { apiKeyPlanSchema } from './schema.js';
import type { apiKeyVerifyConfigSchema } from './schema.js';

/** Trusted identity reconstructed from a verified access token. */
export type SessionGrant = Readonly<{
    sessionId: string;
    actorId: string;
    tenantId: string;
    subject: string;
    roles: readonly string[];
}>;

/** Bearer credential extracted from the HTTP transport. */
export type BearerToken = Readonly<{
    token: string;
}>;

/** Access-token verification policy every verifier shares with the issuer. */
export type AccessTokenVerifyConfig = z.infer<typeof accessTokenVerifyConfigSchema>;

/** Platform claims carried by every access token. */
export type AccessTokenClaims = z.infer<typeof accessTokenClaimsSchema>;

/** API key usage plan. */
export type ApiKeyPlan = z.infer<typeof apiKeyPlanSchema>;

/** API key wire-format policy every issuer and verifier shares. */
export type ApiKeyVerifyConfig = z.infer<typeof apiKeyVerifyConfigSchema>;

/** Signed, self-contained API key payload carried in the key string. */
export type ApiKeyPayload = z.infer<typeof apiKeyPayloadSchema>;
//# sourceMappingURL=types.d.ts.map

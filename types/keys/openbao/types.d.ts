import type { CryptoKey } from 'jose';
import type { z } from 'zod';
import type { PublicJwk } from '../types.js';
import type { SigningKeyEntry, SigningKeyState } from '../types.js';
import type { openBaoKvReadResponseSchema } from './schema.js';
import type { openBaoSigningKeysConfigSchema } from './schema.js';
import type { openBaoTransitSignResponseSchema } from './schema.js';
/** OpenBao key namespace, request policy, and connection configuration. */
export type OpenBaoSigningKeysConfig = z.infer<typeof openBaoSigningKeysConfigSchema>;
/** KV v2 read response containing the lifecycle state document. */
export type OpenBaoKvReadResponse = z.infer<typeof openBaoKvReadResponseSchema>;
/** Transit response containing a JWS-formatted signature. */
export type OpenBaoTransitSignResponse = z.infer<typeof openBaoTransitSignResponseSchema>;
/**
 * Structured cause attached to every OpenBao transport failure.
 *
 * - Operation: Short label naming the lifecycle step that failed.
 * - Path: OpenBao API path that was requested.
 * - Status: HTTP status returned, absent when the request never completed.
 */
export type OpenBaoFailureCause = Readonly<{
    operation: string;
    path: string;
    status?: number;
}>;
/**
 * Imported public key and lifecycle metadata retained in the local snapshot.
 *
 * - Key: Imported public Web Crypto verification key.
 * - Status: Durable lifecycle status.
 * - VerifyUntil: Retirement verification deadline, if applicable.
 */
export type CachedKey = Readonly<{
    key: CryptoKey;
    status: SigningKeyEntry['status'];
    verifyUntil: string | null;
}>;
/**
 * Atomic in-process projection of the last validated lifecycle state.
 *
 * - LoadedAt: Local timestamp when the snapshot was built.
 * - State: Durable state represented by the snapshot.
 * - Keys: Public JWK values eligible for publication.
 * - ByKid: Imported verification keys indexed by exact key identifier.
 */
export type SigningKeySnapshot = Readonly<{
    loadedAt: number;
    state: SigningKeyState;
    keys: readonly PublicJwk[];
    byKid: ReadonlyMap<string, CachedKey>;
}>;
//# sourceMappingURL=types.d.ts.map
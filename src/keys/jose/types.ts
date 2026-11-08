import type { CryptoKey } from 'jose';
import type { z } from 'zod';

import type { PublicJwk } from '../types.js';
import type { SigningKeyState } from '../types.js';
import type { joseSigningKeysConfigSchema } from './schema.js';
import type { keyFilePayloadSchema } from './schema.js';
import type { privateJwkSchema } from './schema.js';

/** Validated Jose provider configuration and local-storage policy. */
export type JoseSigningKeysConfig = z.infer<typeof joseSigningKeysConfigSchema>;

/** Decrypted key-file payload persisted by the Jose provider. */
export type KeyFilePayload = z.infer<typeof keyFilePayloadSchema>;

/** EC P-256 private JWK persisted in the encrypted key file. */
export type PrivateJwk = z.infer<typeof privateJwkSchema>;

/**
 * In-process projection of the Jose provider's signing-key state.
 *
 * - State: Validated lifecycle document the snapshot was built from.
 * - Keys: Public JWK values eligible for JWKS publication.
 * - ByKid: Imported public verification keys indexed by exact key identifier.
 * - ActiveSigner: Active key identifier and its imported private signing key.
 *
 * @remarks
 * Named to match the OpenBao provider's equivalent projection. Built once in `initialize`
 * and never refreshed, because the Jose provider serves one active key and never rotates.
 */
export type SigningKeySnapshot = Readonly<{
  state: SigningKeyState;
  keys: readonly PublicJwk[];
  byKid: ReadonlyMap<string, CryptoKey>;
  activeSigner: Readonly<{ kid: string; privateKey: CryptoKey }>;
}>;

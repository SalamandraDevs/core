import type { SigningKeyState } from './types.js';
/**
 * Parses the signing-key lifecycle document and enforces every invariant providers rely on.
 *
 * @remarks
 * Shared by every signing-key provider so the lifecycle invariants have one definition:
 * unique identifiers, an ES256 P-256 public JWK per entry whose `kid` matches its entry,
 * status-consistent timestamps, exactly one active key, at most one pending key, and a
 * `currentKid` that names the active key. Nothing downstream re-checks any of this, so a
 * failure here is fatal on purpose.
 * @group Keys
 * @category Key Providers
 * @param value - Raw lifecycle document read from a provider's durable store.
 * @param algorithm - JOSE algorithm every published key must declare.
 * @returns Validated signing-key state.
 * @throws {CustomError} KEYS_PROVIDER_ERROR when any signing-key invariant fails.
 */
export declare function validateSigningKeyState(value: unknown, algorithm: 'ES256'): SigningKeyState;
//# sourceMappingURL=validation.d.ts.map
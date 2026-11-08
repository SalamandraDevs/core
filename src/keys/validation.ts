import { CustomError } from '@salamandradevs/tools/shared';

import { signingKeyStateSchema } from './schema.js';
import type { SigningKeyEntry, SigningKeyState } from './types.js';

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
export function validateSigningKeyState(
  value: unknown,
  algorithm: 'ES256'
): SigningKeyState {
  const candidate: SigningKeyState = signingKeyStateSchema.parse(value);
  const keys: readonly SigningKeyEntry[] = candidate.keys;
  const kids: Set<string> = new Set<string>();
  const providerKeyIds: Set<string> = new Set<string>();

  for (const entry of keys) {
    // Duplicates would make `kid` lookup ambiguous and could point two entries at one signing
    // key, so retiring one would destroy the other's material.
    if (kids.has(entry.kid) || providerKeyIds.has(entry.providerKeyId)) {
      throw new CustomError({
        name: 'KEYS_PROVIDER_ERROR',
        message: 'Signing-key lifecycle state contains duplicate key identifiers'
      });
    }

    kids.add(entry.kid);
    providerKeyIds.add(entry.providerKeyId);

    // The JWK is served verbatim to every token consumer, so it must be exactly an ES256
    // P-256 verification key whose `kid` matches the entry that carries it.
    if (
      entry.publicJwk.kty !== 'EC' ||
      entry.publicJwk.crv !== 'P-256' ||
      entry.publicJwk.alg !== algorithm ||
      entry.publicJwk.use !== 'sig' ||
      entry.publicJwk.kid !== entry.kid ||
      !entry.publicJwk.x ||
      !entry.publicJwk.y
    ) {
      throw new CustomError({
        name: 'KEYS_PROVIDER_ERROR',
        message: 'Signing-key lifecycle state contains an invalid public JWK'
      });
    }

    validateEntryTimestamps(entry);
  }

  const active: SigningKeyEntry[] = keys.filter((entry) => entry.status === 'active');
  const pending: SigningKeyEntry[] = keys.filter((entry) => entry.status === 'pending');

  // Exactly one active key, because issuance picks it by status alone; at most one pending,
  // because a second would be promoted into a key the first already replaced.
  if (active.length !== 1 || pending.length > 1) {
    throw new CustomError({
      name: 'KEYS_PROVIDER_ERROR',
      message:
        'Signing-key lifecycle state must contain one active and at most one pending key'
    });
  }

  // `currentKid` is redundant with the active entry, which makes it a useful cross-check that
  // a hand-written or externally provisioned document did not leave the two disagreeing.
  if (candidate.currentKid !== active[0].kid) {
    throw new CustomError({
      name: 'KEYS_PROVIDER_ERROR',
      message: 'Signing-key lifecycle state has an invalid current key'
    });
  }

  return { currentKid: candidate.currentKid, keys };
}

/**
 * Enforces the timestamps each signing-key status permits, and their chronological order.
 *
 * @param entry - Signing-key entry to check.
 * @throws {CustomError} KEYS_PROVIDER_ERROR when the entry carries timestamps its status
 *   forbids.
 */
function validateEntryTimestamps(entry: SigningKeyEntry): void {
  // Each status implies exactly which timestamps may be set. Checking this here is what lets
  // the rest of the system treat a present `verifyUntil` as proof the entry is retired.
  const pendingIsClean: boolean =
    entry.activatedAt === null && entry.retiredAt === null && entry.verifyUntil === null;
  const activeIsClean: boolean =
    entry.activatedAt !== null && entry.retiredAt === null && entry.verifyUntil === null;
  const retiredIsOrdered: boolean =
    entry.activatedAt !== null &&
    entry.retiredAt !== null &&
    entry.verifyUntil !== null &&
    Date.parse(entry.activatedAt) <= Date.parse(entry.retiredAt) &&
    Date.parse(entry.retiredAt) <= Date.parse(entry.verifyUntil);

  const valid: boolean =
    entry.status === 'pending'
      ? pendingIsClean
      : entry.status === 'active'
        ? activeIsClean
        : retiredIsOrdered;

  if (!valid) {
    throw new CustomError({
      name: 'KEYS_PROVIDER_ERROR',
      message: `Signing-key lifecycle entry '${entry.kid}' has timestamps its status forbids`
    });
  }
}

import { CustomError } from '@salamandradevs/tools/shared';
import { signingKeyStateSchema } from './schema.js';
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
export function validateSigningKeyState(value, algorithm) {
    const candidate = signingKeyStateSchema.parse(value);
    const keys = candidate.keys;
    const kids = new Set();
    const providerKeyIds = new Set();
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
        if (entry.publicJwk.kty !== 'EC' ||
            entry.publicJwk.crv !== 'P-256' ||
            entry.publicJwk.alg !== algorithm ||
            entry.publicJwk.use !== 'sig' ||
            entry.publicJwk.kid !== entry.kid ||
            !entry.publicJwk.x ||
            !entry.publicJwk.y) {
            throw new CustomError({
                name: 'KEYS_PROVIDER_ERROR',
                message: 'Signing-key lifecycle state contains an invalid public JWK'
            });
        }
        validateEntryTimestamps(entry);
    }
    const active = keys.filter((entry) => entry.status === 'active');
    const pending = keys.filter((entry) => entry.status === 'pending');
    // Exactly one active key, because issuance picks it by status alone; at most one pending,
    // because a second would be promoted into a key the first already replaced.
    if (active.length !== 1 || pending.length > 1) {
        throw new CustomError({
            name: 'KEYS_PROVIDER_ERROR',
            message: 'Signing-key lifecycle state must contain one active and at most one pending key'
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
function validateEntryTimestamps(entry) {
    // Each status implies exactly which timestamps may be set. Checking this here is what lets
    // the rest of the system treat a present `verifyUntil` as proof the entry is retired.
    const pendingIsClean = entry.activatedAt === null && entry.retiredAt === null && entry.verifyUntil === null;
    const activeIsClean = entry.activatedAt !== null && entry.retiredAt === null && entry.verifyUntil === null;
    const retiredIsOrdered = entry.activatedAt !== null &&
        entry.retiredAt !== null &&
        entry.verifyUntil !== null &&
        Date.parse(entry.activatedAt) <= Date.parse(entry.retiredAt) &&
        Date.parse(entry.retiredAt) <= Date.parse(entry.verifyUntil);
    const valid = entry.status === 'pending'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9rZXlzL3ZhbGlkYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUdwRDs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFDSCxNQUFNLFVBQVUsdUJBQXVCLENBQ3JDLEtBQWMsRUFDZCxTQUFrQjtJQUVsQixNQUFNLFNBQVMsR0FBb0IscUJBQXFCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sSUFBSSxHQUErQixTQUFTLENBQUMsSUFBSSxDQUFDO0lBQ3hELE1BQU0sSUFBSSxHQUFnQixJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQzVDLE1BQU0sY0FBYyxHQUFnQixJQUFJLEdBQUcsRUFBVSxDQUFDO0lBRXRELEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxFQUFFLENBQUM7UUFDekIsMEZBQTBGO1FBQzFGLDJEQUEyRDtRQUMzRCxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDbkUsTUFBTSxJQUFJLFdBQVcsQ0FBQztnQkFDcEIsSUFBSSxFQUFFLHFCQUFxQjtnQkFDM0IsT0FBTyxFQUFFLGdFQUFnRTthQUMxRSxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEIsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFeEMscUZBQXFGO1FBQ3JGLHdFQUF3RTtRQUN4RSxJQUNFLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLElB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
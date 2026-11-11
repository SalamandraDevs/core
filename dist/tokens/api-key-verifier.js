import { CustomError } from '@salamandradevs/tools/shared';
import { apiKeyPayloadSchema } from './schema.js';
/** Characters allowed in a base64url key segment (payload and signature). */
const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
/**
 * Verifies a compact API key's structure, signature, and expiry.
 *
 * @remarks
 * Applies the cheap structural gates first (the configured length ceiling and prefix, two
 * base64url segments), decodes the payload with {@link apiKeyPayloadSchema}, resolves the
 * public key by `kid` through the injected {@link IVerificationKeyProvider}, checks the
 * ES256 signature over `<prefix><payload>`, and rejects an expired key. Key-provider faults
 * propagate unchanged, so an outage is never reported as an invalid key.
 * @group Tokens
 * @category API Keys
 */
export class ApiKeyVerifier {
    config;
    keys;
    /**
     * @param config - Key prefix and length ceiling shared with the issuer.
     * @param keys - Source of public verification keys by `kid`.
     */
    constructor(config, keys) {
        this.config = config;
        this.keys = keys;
    }
    /**
     * Verifies a key's structure, signature, and expiry, returning its payload.
     *
     * @param key - Value of the `x-api-key` header.
     * @returns The verified key payload.
     * @throws {CustomError} AUTHENTICATION_FAILED when the key is malformed, forged, signed
     *   by an unknown key, or expired.
     */
    async verify(key) {
        // Shed oversized input before any slicing, decoding, or crypto; a real key is far
        // shorter than this ceiling, so this never rejects a valid key.
        if (key.length > this.config.maxLength) {
            throw new CustomError({
                name: 'AUTHENTICATION_FAILED',
                message: 'Invalid API key'
            });
        }
        const keyParts = key.startsWith(this.config.prefix)
            ? key.slice(this.config.prefix.length).split('.')
            : [];
        const [encodedPayload, signature] = keyParts;
        // Require exactly two non-empty base64url segments before decoding the payload;
        // base64url decoding is lenient and would not catch stray characters on its own.
        if (keyParts.length !== 2 ||
            !encodedPayload ||
            !signature ||
            !base64UrlPattern.test(encodedPayload) ||
            !base64UrlPattern.test(signature)) {
            throw new CustomError({
                name: 'AUTHENTICATION_FAILED',
                message: 'Invalid API key'
            });
        }
        // The payload is read before the signature check only to find the key by `kid`.
        const payload = this.decodePayload(encodedPayload);
        const verificationKey = await this.keys.getPublicKey(payload.kid);
        const isSigned = verificationKey !== null &&
            (await this.verifySignature(verificationKey, signature, encodedPayload));
        if (!isSigned || payload.exp * 1000 <= Date.now()) {
            throw new CustomError({
                name: 'AUTHENTICATION_FAILED',
                message: 'Invalid API key'
            });
        }
        return payload;
    }
    /**
     * Decodes and validates a base64url payload.
     *
     * @param encodedPayload - Base64url payload segment of the key.
     * @returns The validated payload.
     * @throws {CustomError} AUTHENTICATION_FAILED when the payload cannot be decoded or fails
     *   validation.
     */
    decodePayload(encodedPayload) {
        try {
            const decoded = Buffer.from(encodedPayload, 'base64url').toString('utf8');
            const parsed = JSON.parse(decoded);
            return apiKeyPayloadSchema.parse(parsed);
        }
        catch (error) {
            throw new CustomError({
                name: 'AUTHENTICATION_FAILED',
                message: 'Invalid API key',
                cause: error
            });
        }
    }
    /**
     * Checks the ES256 signature over the prefixed payload segment.
     *
     * @param verificationKey - Public key resolved by `kid`.
     * @param signature - Base64url signature segment.
     * @param encodedPayload - Base64url payload segment.
     * @returns True when the signature is valid.
     * @throws {CustomError} AUTHENTICATION_FAILED when WebCrypto rejects the key or input.
     */
    async verifySignature(verificationKey, signature, encodedPayload) {
        try {
            return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verificationKey, Buffer.from(signature, 'base64url'), new TextEncoder().encode(`${this.config.prefix}${encodedPayload}`));
        }
        catch (error) {
            // The caller picks the `kid`, so a key WebCrypto cannot use for ES256 is an invalid
            // credential, not a server fault.
            throw new CustomError({
                name: 'AUTHENTICATION_FAILED',
                message: 'Invalid API key',
                cause: error
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWtleS12ZXJpZmllci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy90b2tlbnMvYXBpLWtleS12ZXJpZmllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBS2xELDZFQUE2RTtBQUM3RSxNQUFNLGdCQUFnQixHQUFXLGtCQUFrQixDQUFDO0FBRXBEOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxPQUFPLGNBQWM7SUFNTjtJQUNBO0lBTm5COzs7T0FHRztJQUNILFlBQ21CLE1BQTBCLEVBQzFCLElBQThCO1FBRDlCLFdBQU0sR0FBTixNQUFNLENBQW9CO1FBQzFCLFNBQUksR0FBSixJQUFJLENBQTBCO0lBQzlDLENBQUM7SUFFSjs7Ozs7OztPQU9HO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFXO1FBQ3RCLGtGQUFrRjtRQUNsRixnRUFBZ0U7UUFDaEUsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdkMsTUFBTSxJQUFJLFdBQVcsQ0FBQztnQkFDcEIsSUFBSSxFQUFFLHVCQUF1QjtnQkFDN0IsT0FBTyxFQUFFLGlCQUFpQjthQUMzQixDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQWEsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUMzRCxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1lBQ2pELENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFUCxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxHQUFHLFFB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
import { createRemoteJWKSet, errors } from 'jose';
import { CustomError } from '@salamandradevs/tools/shared';
/**
 * Verification keys read from a remote JWKS, such as auth's published key set.
 *
 * @remarks
 * Delegates fetching and caching to `jose`'s remote key set, which refetches on an unknown
 * `kid` after its cooldown. A `kid` the set does not hold resolves to null; a key set that
 * cannot be fetched or parsed is an infrastructure fault.
 * @group Keys
 * @category Key Providers
 */
export class JwksVerificationKeyProvider {
    jwks;
    /** @param jwksUrl - Absolute URL of the JWKS document. */
    constructor(jwksUrl) {
        this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    }
    /**
     * Resolves an ES256 public key from the remote key set.
     *
     * @param kid - Key identifier carried with the signature.
     * @returns The public key, or null when the key set has no key with that identifier.
     * @throws {CustomError} EXTERNAL_API_ERROR when the key set cannot be fetched or is
     *   invalid.
     */
    async getPublicKey(kid) {
        try {
            return await this.jwks({ alg: 'ES256', kid });
        }
        catch (error) {
            if (error instanceof errors.JWKSNoMatchingKey) {
                return null;
            }
            throw new CustomError({
                name: 'EXTERNAL_API_ERROR',
                message: 'Verification key set could not be loaded',
                cause: error
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiandrcy12ZXJpZmljYXRpb24ta2V5LXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2tleXMvandrcy9qd2tzLXZlcmlmaWNhdGlvbi1rZXktcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNsRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFLM0Q7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxPQUFPLDJCQUEyQjtJQUNyQixJQUFJLENBQXdDO0lBRTdELDBEQUEwRDtJQUMxRCxZQUFZLE9BQWU7UUFDekIsSUFBSSxDQUFDLElBQUksR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFXO1FBQzVCLElBQUksQ0FBQztZQUNILE9BQU8sTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFBQyxPQUFPLEtBQWMsRUFBRSxDQUFDO1lBQ3hCLElBQUksS0FBSyxZQUFZLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM5QyxPQUFPLElBQUksQ0FBQztZQUNkLENBQUM7WUFFRCxNQUFNLElBQUksV0FBVyxDQUFDO2dCQUNwQixJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixPQUFPLEVBQUUsMENBQTBDO2dCQUNuRCxLQUFLLEVBQUUsS0FBSzthQUNiLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0NBQ0YifQ==
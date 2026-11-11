import { decodeProtectedHeader, jwtVerify } from 'jose';
import { CustomError } from '@salamandradevs/tools/shared';
import { accessTokenClaimsSchema } from './schema.js';
/**
 * Verifies platform access tokens and reconstructs their session grant.
 *
 * @remarks
 * Checks the protected header, resolves the public key by `kid` through the injected
 * {@link IVerificationKeyProvider}, verifies signature, issuer, audience, and expiry with
 * `jose`, then parses the claims with {@link accessTokenClaimsSchema}.
 * @group Tokens
 * @category Access Tokens
 */
export class AccessTokenVerifier {
    config;
    keys;
    /**
     * @param config - Issuer, audience, and clock tolerance every token must satisfy.
     * @param keys - Source of public verification keys by `kid`.
     */
    constructor(config, keys) {
        this.config = config;
        this.keys = keys;
    }
    /**
     * Verifies one bearer access token.
     *
     * @param credential - Bearer credential selected by the transport layer.
     * @returns Trusted session grant read from the token claims.
     * @throws {CustomError} AUTHENTICATION_FAILED when the token is malformed, signed by an
     *   unknown key, expired, or carries incomplete claims.
     * @throws {CustomError} EXTERNAL_API_ERROR or CONFIG_ERROR when the key provider fails;
     *   propagated unchanged.
     */
    async verify(credential) {
        try {
            const header = decodeProtectedHeader(credential.token);
            if (header.kid === undefined || header.alg !== 'ES256' || header.typ !== 'JWT') {
                throw new Error('JWT protected header is invalid');
            }
            const key = await this.keys.getPublicKey(header.kid);
            if (!key) {
                throw new Error('JWT signing key is unknown');
            }
            const { payload } = await jwtVerify(credential.token, key, {
                algorithms: ['ES256'],
                issuer: this.config.issuer,
                audience: this.config.audience,
                clockTolerance: this.config.clockToleranceSecs
            });
            const claims = accessTokenClaimsSchema.parse(payload);
            return {
                sessionId: claims.sid,
                subject: claims.sub,
                actorId: claims.actorId,
                tenantId: claims.tenantId,
                roles: claims.roles
            };
        }
        catch (error) {
            // An infrastructure fault keeps its classification, so a key-source outage is
            // never reported as an invalid credential.
            if (error instanceof CustomError &&
                (error.name === 'EXTERNAL_API_ERROR' || error.name === 'CONFIG_ERROR')) {
                throw error;
            }
            throw new CustomError({
                name: 'AUTHENTICATION_FAILED',
                message: 'Credentials verification failed',
                cause: error
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzLXRva2VuLXZlcmlmaWVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3Rva2Vucy9hY2Nlc3MtdG9rZW4tdmVyaWZpZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHM0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBUXREOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sT0FBTyxtQkFBbUI7SUFNWDtJQUNBO0lBTm5COzs7T0FHRztJQUNILFlBQ21CLE1BQStCLEVBQy9CLElBQThCO1FBRDlCLFdBQU0sR0FBTixNQUFNLENBQXlCO1FBQy9CLFNBQUksR0FBSixJQUFJLENBQTBCO0lBQzlDLENBQUM7SUFFSjs7Ozs7Ozs7O09BU0c7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQXVCO1FBQ2xDLElBQUksQ0FBQztZQUNILE1BQU0sTUFBTSxHQUE4QixxQkFBcUIsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFbEYsSUFBSSxNQUFNLENBQUMsR0FBRyxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsR0FBRyxLQUFLLE9BQU8sSUFBSSxNQUFNLENBQUMsR0FBRyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUMvRSxNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7WUFDckQsQ0FBQztZQUVELE1BQU0sR0FBRyxHQUFxQixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUV2RSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1lBQ2hELENBQUM7WUFFRCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7Z0JBQ3pELFVBQVUsRUFBRSxDQUFDLE9BQU8sQ0FBQztnQkFDckIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTtnQkFDMUIsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUTtnQkFDOUIsY0FBYyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCO2FBQy9DLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFzQix1QkFBdUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFekUsT0FBTztnQkFDTCxTQUFTLEVBQUUsTUFBTSxDQUFDLEdBQUc7Z0JBQ3JCLE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRztnQkFDbkIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO2dCQUN2QixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7Z0JBQ3pCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSzthQUNwQixDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sS0FBYyxFQUFFLENBQUM7WUFDeEIsOEVBQThFO1lBQzlFLDJDQUEyQztZQUMzQyxJQUNFLEtBQUssWUFBWSxXQUFXO2dCQUM1QixDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssb0JBQW9CLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxjQUFjLENBQUMsRUFDdEUsQ0FBQztnQkFDRCxNQUFNLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxNQUFNLElBQUksV0FBVyxDQUFDO2dCQUNwQixJQUFJLEVBQUUsdUJBQXVCO2dCQUM3QixPQUFPLEVBQUUsaUNBQWlDO2dCQUMxQyxLQUFLLEVBQUUsS0FBSzthQUNiLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0NBQ0YifQ==
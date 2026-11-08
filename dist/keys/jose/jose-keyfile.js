import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { CompactEncrypt, compactDecrypt } from 'jose';
import { CustomError } from '@salamandradevs/tools/shared';
import { keyFilePayloadSchema } from './schema.js';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
/** JWE key-management and content-encryption algorithms used for the key file. */
const KEY_MANAGEMENT_ALG = 'PBES2-HS256+A128KW';
const CONTENT_ENCRYPTION_ALG = 'A256GCM';
/**
 * Reads and decrypts the encrypted key file, or reports its absence.
 *
 * @remarks
 * A decrypt or parse failure is reported, never swallowed: a wrong passphrase must fail
 * loudly rather than be mistaken for an absent file, so a typo cannot discard the keys.
 * @group Keys
 * @category Key Providers
 * @param filePath - Path to the encrypted key file.
 * @param secret - Passphrase that decrypts the compact JWE.
 * @returns Validated key-file payload, or null when no file exists.
 * @throws {CustomError} KEYS_PROVIDER_ERROR when the file exists but cannot be read,
 *   decrypted, or parsed into a valid key-file payload.
 */
export async function readKeyFile(filePath, secret) {
    let jwe;
    try {
        jwe = await readFile(filePath, 'utf8');
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return null;
        }
        throw new CustomError({
            name: 'KEYS_PROVIDER_ERROR',
            message: `Signing-key file at '${filePath}' could not be read`,
            cause: error
        });
    }
    try {
        // `jose` requires PBES2 key management to be opted into on decrypt (an attacker-chosen
        // iteration count is a DoS vector), so allow exactly the algorithms this module writes and
        // reject anything else.
        const { plaintext } = await compactDecrypt(jwe, encoder.encode(secret), {
            keyManagementAlgorithms: [KEY_MANAGEMENT_ALG],
            contentEncryptionAlgorithms: [CONTENT_ENCRYPTION_ALG]
        });
        const payload = JSON.parse(decoder.decode(plaintext));
        return keyFilePayloadSchema.parse(payload);
    }
    catch (error) {
        throw new CustomError({
            name: 'KEYS_PROVIDER_ERROR',
            message: `Signing-key file at '${filePath}' could not be decrypted or is invalid; ` +
                `the passphrase may be wrong`,
            cause: error
        });
    }
}
/**
 * Encrypts and writes the key file, creating it only when none already exists.
 *
 * @remarks
 * The `wx` flag makes the create exclusive and `0o600` restricts it to the owner, so two
 * processes racing on one host resolve to one winner; the loser sees the file already
 * exists, is told so by the false return, and reads the winner's key instead of minting a
 * second.
 * @group Keys
 * @category Key Providers
 * @param filePath - Path to the encrypted key file.
 * @param secret - Passphrase that encrypts the compact JWE.
 * @param payload - Key-file payload to persist.
 * @returns True when this call created the file, false when one already existed.
 * @throws {CustomError} KEYS_PROVIDER_ERROR when encryption or the write fails for any
 *   reason other than the file already existing.
 */
export async function writeKeyFile(filePath, secret, payload) {
    try {
        const jwe = await new CompactEncrypt(encoder.encode(JSON.stringify(payload)))
            .setProtectedHeader({ alg: KEY_MANAGEMENT_ALG, enc: CONTENT_ENCRYPTION_ALG })
            .encrypt(encoder.encode(secret));
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, jwe, { mode: 0o600, flag: 'wx' });
        return true;
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
            return false;
        }
        throw new CustomError({
            name: 'KEYS_PROVIDER_ERROR',
            message: `Signing-key file at '${filePath}' could not be written`,
            cause: error
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiam9zZS1rZXlmaWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2tleXMvam9zZS9qb3NlLWtleWZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUVwQyxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUN0RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFM0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBR25ELE1BQU0sT0FBTyxHQUFnQixJQUFJLFdBQVcsRUFBRSxDQUFDO0FBQy9DLE1BQU0sT0FBTyxHQUFnQixJQUFJLFdBQVcsRUFBRSxDQUFDO0FBRS9DLGtGQUFrRjtBQUNsRixNQUFNLGtCQUFrQixHQUFXLG9CQUFvQixDQUFDO0FBQ3hELE1BQU0sc0JBQXNCLEdBQVcsU0FBUyxDQUFDO0FBRWpEOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLFdBQVcsQ0FDL0IsUUFBZ0IsRUFDaEIsTUFBYztJQUVkLElBQUksR0FBVyxDQUFDO0lBRWhCLElBQUksQ0FBQztRQUNILEdBQUcsR0FBRyxNQUFNLFFBQVEsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUFDLE9BQU8sS0FBYyxFQUFFLENBQUM7UUFDeEIsSUFBSSxLQUFLLFlBQVksS0FBSyxJQUFJLE1BQU0sSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN6RSxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLElBQUksV0FBVyxDQUFDO1lBQ3BCLElBQUksRUFBRSxxQkFBcUI7WUFDM0IsT0FBTyxFQUFFLHdCQUF3QixRQUFRLHFCQUFxQjtZQUM5RCxLQUFLLEVBQUUsS0FBSztTQUNiLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCx1RkFBdUY7UUFDdkYsMkZBQTJGO1FBQzNGLHdCQUF3QjtRQUN4QixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxjQUFjLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDdEUsdUJBQXVCLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztZQUM3QywyQkFBMkIsRUFBRSxDQUFDLHNCQUFzQixDQUFDO1NBQ3RELENBQUMsQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRS9ELE9BQU8sb0JBQW9CLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFBQyxPQUFPLEtBQWMsRUFBRSxDQUFDO1FBQ3hCLE1BQU0sSUFBSSxXQUFXLENBQUM7WUFDcEIsSUFBSSxFQUFFLHFCQUFxQjtZQUMzQixPQUFPLEVBQ0wsd0JBQXdCLFFBQVEsMENBQTBDO2dCQUMxRSw2QkFBNkI7WUFDL0IsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQUM7SUFDTCxDQUFDO0FBQ0gsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxZQUFZLENBQ2hDLFFBQWdCLEVBQ2hCLE1BQWMsRUFDZCxPQUF1QjtJQUV2QixJQUFJLENBQUM7UUFDSCxNQUFNLEdBQUcsR0FBVyxNQUFNLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ2xGLGtCQUFrQixDQUFDLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxzQkFBc0IsRUFBRSxDQUFDO2FBQzVFLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFbkMsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDcEQsTUFBTSxTQUFTLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFNUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBQUMsT0FBTyxLQUFjLEVBQUUsQ0FBQztRQUN4QixJQUFJLEtBQUssWUFBWSxLQUFLLElBQUksTUFBTSxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3pFLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELE1BQU0sSUFBSSxXQUFXLENBQUM7WUFDcEIsSUFBSSxFQUFFLHFCQUFxQjtZQUMzQixPQUFPLEVBQUUsd0JBQXdCLFFBQVEsd0JBQXdCO1lBQ2pFLEtBQUssRUFBRSxLQUFLO1NBQ2IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMifQ==
import * as jwksClient from "jwks-rsa";
import { promisify } from "util";

interface JwksSecretOptions {
    algorithms: string[];
}

/**
 * Fetch a secret from a JWKS endpoint.
 *
 * This is basically a clone of https://github.com/auth0/node-jwks-rsa/blob/master/src/integrations/koa.js,
 * but we allow other algorithms than just RS256, provided they are explicitly allowed by the caller.
 */
export function jwksSecret(
    options: jwksClient.ClientOptions & JwksSecretOptions
): (header: jwksClient.TokenHeader) => Promise<string> {
    const client = jwksClient(options);
    const getSigningKey = promisify(client.getSigningKey);

    return async function secretProvider({ alg, kid }: jwksClient.TokenHeader) {
        if (!alg || !options.algorithms.includes(alg)) {
            throw new Error("Missing / invalid token algorithm");
        }

        return (await getSigningKey(kid)).getPublicKey();
    };
}

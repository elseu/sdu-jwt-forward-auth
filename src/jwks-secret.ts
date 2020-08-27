import * as jwksClient from "jwks-rsa";

interface JwksSecretOptions {
    algorithms: string[]
}

/**
 * Fetch a secret from a JWKS endpoint.
 *
 * This is basically a clone of https://github.com/auth0/node-jwks-rsa/blob/master/src/integrations/koa.js,
 * but we allow other algorithms than just RS256, provided they are explicitly allowed by the caller.
 */
export function jwksSecret(options: jwksClient.ClientOptions & JwksSecretOptions) {
  const client = jwksClient(options);

  return function secretProvider({ alg, kid }: jwksClient.TokenHeader) {

    return new Promise((resolve, reject) => {

      if (!alg || !options.algorithms.includes(alg)) {
        return reject(new Error('Missing / invalid token algorithm'));
      }

      client.getSigningKey(kid, (err, key) => {
        if (err) {
          return reject(err);
        }

        // Provide the key.
        const untypedKey: any = key as unknown;
        resolve(untypedKey.publicKey || untypedKey.rsaPublicKey);
      });
    });
  };
};

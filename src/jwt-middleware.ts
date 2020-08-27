import fetch from "node-fetch";
import * as jwt from "koa-jwt";
import { jwksSecret } from "./jwks-secret";
import { isTruthy } from "./util";

/**
 * Load the middleware to read and validate the JWT from the request.
*/
export async function loadJwtMiddleware(): Promise<jwt.Middleware> {
    let jwksUri: string | undefined;

    if (process.env.DISCOVERY_URL) {
        const discoveryUrl = process.env.DISCOVERY_URL;
        console.log('Discovery URL:', discoveryUrl);
        const discoveryData = await (await fetch(discoveryUrl)).json();
        if (!discoveryData || !discoveryData.jwks_uri) {
            throw new Error(`No jwks_uri found in discovery document at ${discoveryUrl}`);
        }
        jwksUri = discoveryData.jwks_uri;
    } else if (process.env.JWKS_URL) {
        jwksUri = process.env.JWKS_URL;
    }

    if (!jwksUri) {
        throw new Error("No JWKS_URL or DISCOVERY_URL set.");
    }
    console.log('JWKS URL:', jwksUri);

    const algorithms = (process.env.JWT_ALGOS || 'RS256,RS384,RS512').split(',');
    console.log('Algorithms:', algorithms.join(', '));

    const jwtOptions: any = {
        secret: jwksSecret({
            strictSsl: true,
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 1,
            jwksUri,
            algorithms
        }),
        algorithms
    };

    if (process.env.REQUIRE_AUDIENCE) {
        jwtOptions.audience = process.env.REQUIRE_AUDIENCE;
        console.log('Audience:', jwtOptions.audience);
    }

    if (process.env.REQUIRE_ISSUER) {
        jwtOptions.issuer = process.env.REQUIRE_ISSUER;
        console.log('Issuer:', jwtOptions.issuer);
    }

    jwtOptions.passthrough = !isTruthy(process.env.REQUIRE_TOKEN);
    console.log('Require token:', jwtOptions.passthrough ? 'no' : 'yes');

    return jwt(jwtOptions);
}

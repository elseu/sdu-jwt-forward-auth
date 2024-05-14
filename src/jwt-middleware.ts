import { boolean } from 'boolean';
import jsonwebtoken from 'jsonwebtoken';
import { Middleware } from 'koa';
import jwt from 'koa-jwt';

import { jwksSecret } from './jwks-secret';
import { wildcardMatcherFromEnv } from './matcher';
import { getTokenFromContext } from './utils/getTokenFromContext';
import { loadDiscoveryData } from './utils/loadDiscoveryData';

/**
 * Generate dynamic middleware for multiple backend OIDC IDPs.
 */
export function dynamicJwtMiddleware(): Middleware {
  const { isMatch: issuerIsAllowed, patterns: issuerPatterns } =
    wildcardMatcherFromEnv('ALLOWED_ISSUER');

  console.log('Allowed issuers:', issuerPatterns);

  const defaultIssuer = process.env.DEFAULT_ISSUER ? process.env.DEFAULT_ISSUER : undefined;
  if (defaultIssuer) {
    console.log('Default issuer:', defaultIssuer);
  }

  // Set a maximum number of issuers to prevent a DoS where the process can run out of memory if it gets lots of tokens with different valid issuer URLs.
  const maxIssuerCount = parseInt(process.env.MAX_ISSUER_COUNT ?? '50', 10);
  console.log('Max number of issuers:', maxIssuerCount);

  const requireToken = boolean(process.env.REQUIRE_TOKEN);
  console.log('Require token: ', requireToken);

  const algorithms = (process.env.JWT_ALGOS || 'RS256,RS384,RS512').split(',');
  console.log('Algorithms:', algorithms.join(', '));

  let requiredAudience: string | undefined;
  if (process.env.REQUIRE_AUDIENCE) {
    requiredAudience = process.env.REQUIRE_AUDIENCE;
    console.log('Required audience:', requiredAudience);
  }

  const jwtMiddlewares: Record<string, jwt.Middleware> = {};

  return async (ctx, next) => {
    let token = getTokenFromContext(ctx);

    if (token === null) {
      // No token provided.
      if (requireToken) {
        ctx.throw(401);
      } else {
        await next();
      }
      return;
    }

    // We have a token. Check its issuer, then load the right middleware.
    const tokenData = jsonwebtoken.decode(token);
    if (!tokenData || typeof tokenData === 'string') {
      // Invalid token data.
      ctx.throw(401);
      return;
    }

    const issuer = tokenData.iss ?? defaultIssuer;

    if (!issuer) {
      // No issuer found.
      ctx.throw(401);
      return;
    }

    if (!issuerIsAllowed(issuer)) {
      // Issuer is not allowed.
      console.log('Invalid issuer: ', issuer);
      ctx.throw(401);
      return;
    }

    if (!jwtMiddlewares[issuer]) {
      console.log('New issuer: ', issuer);
      if (Object.keys(jwtMiddlewares).length > maxIssuerCount) {
        console.error('Max issuer count exceeded: ', maxIssuerCount);
        ctx.throw(500);
        return;
      }

      try {
        jwtMiddlewares[issuer] = await loadIssuerJwtMiddleware(issuer);
      } catch (e) {
        console.error(e);
        ctx.throw(500);
        return;
      }
    }

    await jwtMiddlewares[issuer](ctx, next);
  };

  async function loadIssuerJwtMiddleware(issuer: string): Promise<jwt.Middleware> {
    const discoveryData = await loadDiscoveryData(issuer);
    const jwksUri: string | undefined = discoveryData.data.jwks_uri;

    if (!jwksUri) {
      throw new Error(`No JWKS URI found for issuer" ${issuer}`);
    }
    console.log('JWKS URL:', jwksUri);

    const jwtOptions: Partial<jwt.Options> = {
      secret: jwksSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 1,
        jwksUri,
        algorithms,
      }),
      algorithms,
    };

    if (requiredAudience) {
      jwtOptions.audience = requiredAudience;
    }

    return jwt(jwtOptions as jwt.Options);
  }
}

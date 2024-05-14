import { Middleware } from 'koa';
import jwt from 'koa-jwt';

import { Issuer } from 'openid-client';
import { jwksSecret } from '../jwks-secret';
import { JWT_ALGOS, REQUIRE_AUDIENCE } from '../constants';

/**
 * Generate dynamic middleware for multiple backend OIDC IDPs.
 */
export function dynamicJwtMiddleware(): Middleware<{
  token: string | undefined;
  issuer: Issuer | undefined;
}> {
  console.log('Algorithms:', JWT_ALGOS.join(', '));

  if (REQUIRE_AUDIENCE) {
    console.log('Required audience:', REQUIRE_AUDIENCE);
  }

  const jwtMiddlewares: Record<string, jwt.Middleware> = {};

  return async (ctx, next) => {
    const { issuer } = ctx.state;

    if (!issuer) {
      await next();
    }

    if (!jwtMiddlewares[issuer.metadata.issuer]) {
      const jwtOptions: Partial<jwt.Options> = {
        secret: jwksSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 1,
          jwksUri: issuer.metadata.jwks_uri,
          algorithms: JWT_ALGOS,
        }),
        algorithms: JWT_ALGOS,
      };

      if (REQUIRE_AUDIENCE) {
        jwtOptions.audience = REQUIRE_AUDIENCE;
      }

      jwtMiddlewares[issuer.metadata.issuer] = jwt(jwtOptions as jwt.Options);
    }

    await jwtMiddlewares[issuer.metadata.issuer](ctx, next);
  };
}

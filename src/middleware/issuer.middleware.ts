import { DEFAULT_ISSUER, MAX_ISSUER_COUNT } from '../constants';
import { wildcardMatcherFromEnv } from '../matcher';
import jsonwebtoken from 'jsonwebtoken';
import { Middleware } from 'koa';
import { Issuer } from 'openid-client';

const issuers: Record<string, Issuer> = {};

export function issuerMiddleware(): Middleware<{
  token: string | undefined;
  issuer: Issuer | undefined;
}> {
  console.log('Max number of issuers:', MAX_ISSUER_COUNT);

  const { isMatch: issuerIsAllowed, patterns: issuerPatterns } =
    wildcardMatcherFromEnv('ALLOWED_ISSUER');

  console.log('Allowed issuers:', issuerPatterns);

  if (DEFAULT_ISSUER) {
    console.log('Default issuer:', DEFAULT_ISSUER);
  }

  return async (ctx, next) => {
    const { token } = ctx.state;

    if (!token) {
      await next();
    }

    const tokenData = jsonwebtoken.decode(ctx.state.token);

    if (!tokenData || typeof tokenData === 'string') {
      // Invalid token data.
      ctx.throw(401);
      return;
    }

    const issuerKey = tokenData.iss ?? DEFAULT_ISSUER;

    if (!issuerKey) {
      // No issuer found.
      ctx.throw(401);
      return;
    }

    // if issuer exist in the cache, use it
    if (issuers[issuerKey]) {
      ctx.state.issuer = issuers[issuerKey];
      await next();
    }

    if (!issuerIsAllowed(issuerKey)) {
      // Issuer is not allowed.
      console.log('Invalid issuer: ', issuerKey);
      ctx.throw(401);
      return;
    }

    console.log('New issuer: ', issuerKey);
    if (Object.keys(issuers).length > MAX_ISSUER_COUNT) {
      console.error('Max issuer count exceeded: ', MAX_ISSUER_COUNT);
      ctx.throw(500);
      return;
    }

    const discoveryUrl = new URL('/.well-known/openid-configuration', issuerKey);
    const issuer = await Issuer.discover(discoveryUrl.toString());

    if (!issuer.metadata.jwks_uri) {
      throw new Error(`No JWKS URI found for issuer" ${issuerKey}`);
    }

    issuers[issuerKey] = issuer;
    ctx.state.issuer = issuers[issuerKey];
    await next();
  };
}

import * as Sentry from '@sentry/node';
import Koa, { HttpError } from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';

import { dynamicJwtMiddleware } from './middleware/jwt.middleware';
import { tokenToHeaders } from './token-to-headers';
import { tokenMiddleware } from './middleware/token.middleware';
import { issuerMiddleware } from './middleware/issuer.middleware';
import { ENVIRONMENT, HEADER_PREFIX, LOG_REQUESTS, PORT } from './constants';
import { Issuer } from 'openid-client';
import { getUserInfo } from './userInfo';

type TokenData = Record<string, unknown>;

Sentry.init({
  dsn: 'https://4146529fca2048ca8e903740153a39f1@sentry.awssdu.nl/78',
  environment: ENVIRONMENT,
  beforeSend(event, hint) {
    const originalException = hint?.originalException;

    // Check if the error is a Koa error with status 401
    if (
      originalException &&
      originalException instanceof HttpError &&
      originalException.status === 401
    ) {
      // If it's a 401 error, don't send it to Sentry
      return null;
    }

    // Otherwise, send the event to Sentry
    return event;
  },
});

const app = new Koa();
const router = new Router();

Sentry.setupKoaErrorHandler(app);

(async () => {
  console.group('💥 Initializing... 🚀');

  console.log('Header prefix:', HEADER_PREFIX);

  if (LOG_REQUESTS) {
    app.use(logger());
  }

  // Main authentication route.
  router.get(
    '/',
    tokenMiddleware(),
    issuerMiddleware(),
    dynamicJwtMiddleware(),
    (ctx: Koa.ParameterizedContext<{ user: TokenData | undefined; token: string }>) => {
      ctx.body = '';
      const { token, user } = ctx.state;

      if (user) {
        ctx.set(tokenToHeaders(user, { headerPrefix: HEADER_PREFIX }));
        const encodedToken = encodeURIComponent(Buffer.from(token).toString('base64'));
        ctx.set(`${HEADER_PREFIX}UserInfo`, `${ctx.origin}/userinfo/${encodedToken}`);
      }

      ctx.set('Authorization', '');
    },
  );

  router.get(
    '/userinfo/:encodedToken',
    async (ctx: Koa.ParameterizedContext<{ token: string }>, next) => {
      const encodedToken = ctx.params.encodedToken;
      const token = Buffer.from(encodedToken, 'base64').toString('utf-8');
      ctx.state.token = token;
      await next();
    },
    issuerMiddleware(),
    async (ctx: Koa.ParameterizedContext<{ issuer: Issuer; token: string }>, next) => {
      const { issuer, token } = ctx.state;

      if (!issuer) {
        ctx.throw(401, 'Issuer not found');
      }

      const userInfo = await getUserInfo({ url: issuer.metadata.userinfo_endpoint, token });

      ctx.body = userInfo;
    },
  );

  // Health check.
  router.get('/_health', (ctx) => {
    ctx.body = 'OK';
  });

  app.use(router.middleware());

  app.on('error', (err, ctx) => {
    if (err instanceof HttpError && err.status === 401) {
      return;
    }

    console.error(err);
  });

  console.groupEnd();

  app.listen(PORT, () => {
    console.log(`🚀 Listening on ${PORT}`);
  });
})();

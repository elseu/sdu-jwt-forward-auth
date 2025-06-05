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
        const headers = tokenToHeaders(user, { headerPrefix: HEADER_PREFIX });
        ctx.set(headers);
        ctx.set(HEADER_PREFIX + 'AccessToken', token);
      }

      ctx.set('Authorization', '');
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

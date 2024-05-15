import * as Sentry from '@sentry/node';
import Koa from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';

import { dynamicJwtMiddleware } from './middleware/jwt.middleware';
import { tokenToHeaders } from './token-to-headers';
import { tokenMiddleware } from './middleware/token.middleware';
import { issuerMiddleware } from './middleware/issuer.middleware';
import { HEADER_PREFIX, LOG_REQUESTS, PORT } from './constants';
import { Issuer } from 'openid-client';
import { getUserInfo } from './userInfo';

type TokenData = Record<string, unknown>;

Sentry.init({
  dsn: 'https://4146529fca2048ca8e903740153a39f1@sentry.awssdu.nl/78',
});

const app = new Koa();
const router = new Router();

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
      }

      if (token) {
        ctx.set(HEADER_PREFIX + 'User-Info-Url', ctx.origin + '/userinfo/' + token);
      }

      ctx.set('Authorization', '');
    },
  );

  router.get(
    '/userinfo/:token',
    async (ctx: Koa.ParameterizedContext<{ token: string; issuer: Issuer }>, next) => {
      const token = ctx.params.token;
      ctx.state.token = token;

      await issuerMiddleware()(ctx, next);

      const { issuer } = ctx.state;

      if (!issuer) {
        ctx.throw(401, 'Issuer not found');
      }

      return await getUserInfo({ url: ctx.state.issuer.metadata.userinfo_endpoint, token });
    },
  );

  // Health check.
  router.get('/_health', (ctx) => {
    ctx.body = 'OK';
  });

  app.use(router.middleware());

  app.on('error', (err, ctx) => {
    Sentry.withScope((scope) => {
      scope.setSDKProcessingMetadata({ request: ctx.request });
      Sentry.captureException(err);
    });
  });

  console.groupEnd();

  app.listen(PORT, () => {
    console.log(`🚀 Listening on ${PORT}`);
  });
})();

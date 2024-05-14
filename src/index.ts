import * as Sentry from '@sentry/node';
import Koa from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';

import { dynamicJwtMiddleware } from './middleware/jwt.middleware';
import { tokenToHeaders } from './token-to-headers';
import { tokenMiddleware } from './middleware/token.middleware';
import { issuerMiddleware } from './middleware/issuer.middleware';
import { HEADER_PREFIX, LOG_REQUESTS, PORT } from './constants';

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
    (ctx: Koa.ParameterizedContext<{ user: TokenData | undefined }>) => {
      ctx.body = '';
      if (ctx.state.user) {
        ctx.set(tokenToHeaders(ctx.state.user, { headerPrefix: HEADER_PREFIX }));
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

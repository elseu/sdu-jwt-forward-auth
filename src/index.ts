import * as Sentry from '@sentry/node';
import { boolean } from 'boolean';
import dotenv from 'dotenv';
import Koa from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';

import { dynamicJwtMiddleware } from './jwt-middleware';
import { tokenToHeaders } from './token-to-headers';
import { loadDiscoveryData } from './utils/loadDiscoveryData';
import axios from 'axios';
import { getKVEsFromUserinfo } from './utils/getKVEsFromUserinfo';
import { getTokenFromContext } from './utils/getTokenFromContext';

type TokenData = Record<string, unknown>;

dotenv.config();

Sentry.init({
  dsn: 'https://4146529fca2048ca8e903740153a39f1@sentry.awssdu.nl/78',
});

const app = new Koa();
const router = new Router();

(async () => {
  console.group('💥 Initializing... 🚀');

  const headerPrefix = process.env.HEADER_PREFIX ?? 'X-Auth-';
  console.log('Header prefix:', headerPrefix);

  // Main authentication route.
  router.get(
    '/',
    dynamicJwtMiddleware(),
    async (ctx: Koa.ParameterizedContext<{ user: TokenData | undefined }>) => {
      ctx.body = '';
      if (ctx.state.user) {
        if (boolean(process.env.KVE_HEADER)) {
          const discoveryData = await loadDiscoveryData(ctx.state.user.iss as string);
          const token = getTokenFromContext(ctx);
          const userInfoResponse = await axios(discoveryData.userinfo_endpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          // get kves from userinfo and append them to user
          ctx.state.user.kve = getKVEsFromUserinfo(userInfoResponse.data);
        }

        ctx.set(tokenToHeaders(ctx.state.user, { headerPrefix }));
      }
      ctx.set('Authorization', '');
    },
  );

  // Health check.
  router.get('/_health', (ctx) => {
    ctx.body = 'OK';
  });

  if (boolean(process.env.LOG_REQUESTS)) {
    app.use(logger());
  }
  app.use(router.middleware());

  app.on('error', (err, ctx) => {
    Sentry.withScope((scope) => {
      scope.setSDKProcessingMetadata({ request: ctx.request });
      Sentry.captureException(err);
    });
  });

  const port = parseInt(process.env.PORT ?? '3000');

  console.groupEnd();

  app.listen(port, () => {
    console.log(`🚀 Listening on ${port}`);
  });
})();

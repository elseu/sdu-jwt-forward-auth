import { boolean } from 'boolean';
import { REQUIRE_TOKEN } from '../constants';
import { DefaultContext, Middleware } from 'koa';

function getTokenFromContext(ctx: DefaultContext): string | null {
  const authHeader = ctx.headers.authorization;
  let token: null | string = null;
  if (authHeader) {
    const match = authHeader.match(/^Bearer[ ]+(.*)$/);
    if (match) {
      token = match[1];
    }
  }
  return token;
}

export function tokenMiddleware(): Middleware<{ token: string | undefined }> {
  console.log('Require token: ', REQUIRE_TOKEN);

  return async (ctx: DefaultContext, next: () => Promise<void>) => {
    const token = getTokenFromContext(ctx);

    ctx.state.token = token;

    const isTokenRequired = REQUIRE_TOKEN || boolean(ctx.query.requireToken);

    if (isTokenRequired && !token) {
      ctx.throw(401);
    }

    await next();
  };
}

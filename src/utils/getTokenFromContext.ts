import { DefaultContext } from 'koa';

export function getTokenFromContext(ctx: DefaultContext) {
  const authHeader = ctx.headers.authorization;
  if (authHeader) {
    const match = authHeader.match(/^Bearer[ ]+(.*)$/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

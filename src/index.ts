import * as Koa from "koa";
import * as Router from "koa-router";
import * as logger from "koa-logger";
import * as dotenv from "dotenv";

import { loadJwtMiddleware } from "./jwt-middleware";
import { tokenToHeaders } from "./token-to-headers";
import { isTruthy } from "./util";

type TokenData = Record<string, unknown>;

dotenv.config();

const app = new Koa();
const router = new Router();

(async () => {
    console.group("💥 Initializing...");

    app.use(await loadJwtMiddleware());

    const headerPrefix = process.env.HEADER_PREFIX ?? "X-Auth-";
    console.log("Header prefix:", headerPrefix);

    // Main authentication route.
    router.get(
        "/",
        (ctx: Koa.ParameterizedContext<{ user: TokenData | undefined }>) => {
            ctx.body = "";
            if (ctx.state.user) {
                ctx.set(tokenToHeaders(ctx.state.user, { headerPrefix }));
            } else if (ctx.headers.authorization) {
                // It's OK if you don't pass an authorization header if REQUIRE_TOKEN is not true.
                // But passing an invalid authorization header? That's not OK.
                ctx.status = 401;
            }
            ctx.set("Authorization", "");
        }
    );

    // Health check.
    router.get("/_health", (ctx) => {
        ctx.body = "OK";
    });

    if (isTruthy(process.env.LOG_REQUESTS)) {
        app.use(logger());
    }
    app.use(router.middleware());

    const port = parseInt(process.env.PORT ?? "3000");

    console.groupEnd();

    app.listen(port, () => {
        console.log(`🚀 Listening on ${port}`);
    });
})();

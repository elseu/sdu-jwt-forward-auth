import * as Koa from "koa";
import * as Router from "koa-router";
import * as logger from "koa-logger";
import * as dotenv from "dotenv";

import { dynamicJwtMiddleware } from "./jwt-middleware";
import { tokenToHeaders } from "./token-to-headers";
import { boolean } from "boolean";

type TokenData = Record<string, unknown>;

dotenv.config();

const app = new Koa();
const router = new Router();

(async () => {
    console.group("💥 Initializing...");

    app.use(dynamicJwtMiddleware());

    const headerPrefix = process.env.HEADER_PREFIX ?? "X-Auth-";
    console.log("Header prefix:", headerPrefix);

    // Main authentication route.
    router.get(
        "/",
        (ctx: Koa.ParameterizedContext<{ user: TokenData | undefined }>) => {
            ctx.body = "";
            if (ctx.state.user) {
                ctx.set(tokenToHeaders(ctx.state.user, { headerPrefix }));
            }
            ctx.set("Authorization", "");
        }
    );

    // Health check.
    router.get("/_health", (ctx) => {
        ctx.body = "OK";
    });

    if (boolean(process.env.LOG_REQUESTS)) {
        app.use(logger());
    }
    app.use(router.middleware());

    const port = parseInt(process.env.PORT ?? "3000");

    console.groupEnd();

    app.listen(port, () => {
        console.log(`🚀 Listening on ${port}`);
    });
})();

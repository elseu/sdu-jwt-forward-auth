import * as Koa from "koa";
import * as Router from "koa-router";
import * as logger from "koa-logger";
import * as dotenv from "dotenv";

import { loadJwtMiddleware } from "./jwt-middleware";

dotenv.config();

const app = new Koa();
const router = new Router();

(async () => {
    console.group('💥 Initializing...');

    app.use(await loadJwtMiddleware());

    router.get("/", (ctx: Koa.ParameterizedContext<{ user: {} }>) => {
        ctx.body = "";
        console.log(ctx.state.user);
    });
    router.get("/_health", ctx => {
        ctx.body = "";
    });

    app.use(logger());
    app.use(router.middleware());

    const port = parseInt(process.env.PORT ?? '3000');

    console.groupEnd();

    app.listen(port, () => {
        console.log(`🚀 Listening on ${port}`);
    });

})();

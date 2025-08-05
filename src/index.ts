import { Elysia } from "elysia";
import { manifest } from "./modules/manifest";
import logixlysia from "logixlysia";
import { setupDefaultOSS } from "./utils/oss-provider/factory";
import { initializeOSS } from "./config/oss-config.example";
import { cron } from "@elysiajs/cron";
await initializeOSS();
const app = new Elysia({
  name: "Expo Updates Server with Elysia",
})
  .use(
    cron({
      name: "heartbeat",
      pattern: "0 0 * * * ?",
      run() {
        initializeOSS();
      },
    }),
  )
  .use(
    logixlysia({
      config: {
        showStartupMessage: false,
        useColors: true,
        timestamp: {
          translateTime: "yyyy-mm-dd HH:MM:ss",
        },
        ip: true,
        customLogFormat:
          "🦊 {now} {level} {duration} {method} {pathname} {status} {ip}",
        logFilePath: "./logs/app.log",
      },
    }),
  )
  .use(manifest);
const port = Number(process.env.port || 3000);

app.listen(port);

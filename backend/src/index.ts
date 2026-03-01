import { buildApp } from "./app.js";
import { closeDb } from "./db.js";
import { config } from "./config.js";
import { ensureSchema } from "./migrate.js";

const app = buildApp();

async function start(): Promise<void> {
  await ensureSchema(app.log);
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`backend ready at ${config.HOST}:${config.PORT}`);
}

void start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    void app.close().finally(() => closeDb());
  });
}

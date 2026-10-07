import { app } from "./app.js";
import { config } from "./config/config.js";
import { sequelize, closeDatabase } from "./database/connection.js";
import { logger } from "./shared/utils/logger.js";

let server;

try {
  await sequelize.authenticate();
  server = app.listen(config.port, "0.0.0.0", () => {
    logger.info({ port: config.port }, "SLSEA API listening");
  });
} catch (error) {
  logger.error({ err: error }, "application startup failed");
  process.exitCode = 1;
}

async function shutdown(signal) {
  logger.info({ signal }, "shutdown requested");
  if (!server) {
    await closeDatabase();
    return;
  }
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

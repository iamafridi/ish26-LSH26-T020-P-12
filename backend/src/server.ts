import { createServer } from "node:http";

import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { getEnvironment } from "./config/env.js";

async function startServer(): Promise<void> {
  const environment = getEnvironment();
  await connectDatabase();

  const server = createServer(createApp({ frontendUrl: environment.FRONTEND_URL }));
  server.listen(environment.PORT, () => {
    console.log(`Personal Ledger API listening on port ${environment.PORT}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received. Shutting down.`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error: unknown) => {
  console.error("Unable to start the API.", error);
  process.exit(1);
});

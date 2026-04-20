import "dotenv/config";

import http from "http";
import app from "./app";
import { connectDB } from "./config/database";
import { startReservationJobs } from "./jobs/reservation.job";
import { initNotificationSocket } from "./realtime/notification.socket";
import { logger } from "./utils/logger";

let startPromise: Promise<void> | null = null;
let activeServer: http.Server | null = null;
let jobsStarted = false;

function shutdown(signal: NodeJS.Signals) {
  logger.info(`${signal} received. Shutting down server.`);

  if (!activeServer) {
    process.exit(0);
    return;
  }

  activeServer.close((error) => {
    if (error) {
      logger.error("Server shutdown failed:", error);
      process.exit(1);
      return;
    }

    process.exit(0);
  });
}

export async function start() {
  if (startPromise) {
    return startPromise;
  }

  startPromise = (async () => {
    await connectDB();

    if (!jobsStarted) {
      startReservationJobs();
      jobsStarted = true;
    }

    const port = Number(process.env.PORT) || 5000;
    const server = http.createServer(app);
    initNotificationSocket(server);

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${port} is already in use. Stop the existing process or change PORT.`);
      } else {
        logger.error("HTTP server failed to start:", error);
      }

      process.exit(1);
    });

    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        activeServer = server;
        logger.info(`Server running at http://localhost:${port}`);
        logger.info(`Swagger Docs: http://localhost:${port}/docs`);
        resolve();
      });
    });
  })();

  return startPromise;
}

start().catch((error) => {
  logger.error("Server failed:", error);
  process.exit(1);
});

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

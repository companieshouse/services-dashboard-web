#!/usr/bin/env node

import 'dotenv/config'
import * as http from "http";
import * as config from "../config";
import { logger, logErr } from "../utils/logger";
import app from "../app";
import * as mongo from "../mongo/mongo";

const forcefullyShutdownMS = 10000;
// Get port from environment and store in Express.
app.set("port", config.PORT);

// Create HTTP server.
const server = http.createServer(app);

// Listen on provided port, on all network interfaces.
server.listen(config.PORT);
server.on("error", onError);
logger.info(`Server is running at http://localhost:${config.PORT}/dashboard`);


// Event listener for HTTP server "error" event.
/* eslint-disable @typescript-eslint/no-explicit-any */
function onError(error: any) {
  if (error.syscall !== "listen") {
    throw error;
  }

  // handle specific listen errors with friendly messages
  switch (error.code) {
      case "EACCES":
        logger.error(config.PORT + " requires elevated privileges");
        process.exit(1);
        break;
      case "EADDRINUSE":
        logger.error(config.PORT + " is already in use");
        process.exit(1);
        break;
      default:
        throw error;
  }
}

// Graceful shutdown
function gracefulShutdown() {
  logger.info("Shutting down gracefully...");
  server.close(async () => {
    logger.info("Closed out remaining connections.");
    mongo.close();
    process.exit(0);
  });

  // forcefully shut down after 10 sec
  setTimeout(() => {
    logger.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, forcefullyShutdownMS);
}

// Initialize MongoDB connection
mongo.init().then(() => {
  logger.info("MongoDB initialized successfully.");
}).catch((error) => {
  logger.error(`Failed to initialize MongoDB: ${(error as Error).message}`);
  process.exit(1);
});

// Listen for termination signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT",  gracefulShutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logErr(error);
  gracefulShutdown();
});
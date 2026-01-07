import { Db, MongoClient, ClientSession } from "mongodb";
import * as config from "../config";
import { logger } from "../utils/logger";

let client: MongoClient | null = null;
let db: Db | null = null;
let session: ClientSession | null = null;

export async function connectToDb() {
  try {
    logger.info(`Connecting to Mongo: ${config.MONGO_HOST_AND_PORT}`);

    client = new MongoClient(config.MONGO_URI);
    await client.connect();

    db = client.db(config.MONGO_DB_NAME);
    session = client.startSession();

    logger.info("Mongo connected.");
  } catch (error: any) {
    logger.error(`Mongo connection error: ${error.message}`);
    throw error;
  }
}

export function getDb(): Db {
  if (!db) throw new Error("Database not initialised. Call connectToDb() first.");
  return db;
}

export function getSession(): ClientSession {
  if (!session) throw new Error("Mongo session not initialised. Call connectToDb() first.");
  return session;
}

export async function closeDb() {
  try {
    await session?.endSession();
    await client?.close();
    logger.info("Mongo connection closed.");
  } catch (error: any) {
    logger.error(`Error closing Mongo connection: ${error.message}`);
  }
}
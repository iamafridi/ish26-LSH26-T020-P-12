import mongoose from "mongoose";

import { getEnvironment } from "./env.js";

let connectionPromise: Promise<typeof mongoose> | undefined;

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) return;
  const { MONGODB_URI } = getEnvironment();
  connectionPromise ??= mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  try {
    await connectionPromise;
  } catch (error) {
    connectionPromise = undefined;
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  connectionPromise = undefined;
}

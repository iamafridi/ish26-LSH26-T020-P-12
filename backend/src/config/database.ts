import mongoose from "mongoose";

import { getEnvironment } from "./env.js";

export async function connectDatabase(): Promise<void> {
  const { MONGODB_URI } = getEnvironment();
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

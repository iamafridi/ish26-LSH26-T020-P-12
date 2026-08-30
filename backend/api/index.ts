import handler from "@vercel/node";
import { createApp } from "../src/app.js";

let app: ReturnType<typeof createApp>;
try {
  app = createApp();
} catch (error) {
  console.error("[api/index] Failed to create app:", error);
  throw error;
}

export default handler(app);

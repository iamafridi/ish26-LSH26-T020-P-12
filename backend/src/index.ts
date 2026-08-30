import { createApp } from "./app.js";

const app = createApp({ frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000" });

export default app;

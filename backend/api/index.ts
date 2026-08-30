import handler from "@vercel/node";
import { createApp } from "../src/app.js";

const app = createApp();

export default handler(app);

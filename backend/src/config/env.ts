import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.url().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z.email("FIREBASE_CLIENT_EMAIL must be valid"),
  FIREBASE_PRIVATE_KEY: z.string().min(1, "FIREBASE_PRIVATE_KEY is required"),
  OCR_PROVIDER: z.enum(["google-vision"]).default("google-vision"),
});

export type Environment = z.infer<typeof envSchema>;

let cachedEnvironment: Environment | undefined;

export function getEnvironment(): Environment {
  if (cachedEnvironment) {
    return cachedEnvironment;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }

  cachedEnvironment = result.data;
  return cachedEnvironment;
}

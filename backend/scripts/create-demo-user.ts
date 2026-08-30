import "dotenv/config";

import { getFirebaseAdminAuth } from "../src/config/firebase-admin.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the demo-user script.`);
  return value;
}

async function createDemoUser(): Promise<void> {
  const email = required("DEMO_USER_EMAIL");
  const password = required("DEMO_USER_PASSWORD");
  const requestedUid = process.env.DEMO_USER_UID?.trim();
  const auth = getFirebaseAdminAuth();

  try {
    const existing = await auth.getUserByEmail(email);
    console.log(`Demo user already exists with UID ${existing.uid}.`);
    return;
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
    if (code !== "auth/user-not-found") throw error;
  }

  const user = await auth.createUser({
    ...(requestedUid ? { uid: requestedUid } : {}),
    email,
    password,
    displayName: "Demo User",
    emailVerified: true,
  });
  console.log(`Demo user created with UID ${user.uid}. The password was not printed.`);
}

createDemoUser().catch((error: unknown) => {
  console.error("Failed to create demo user.", error);
  process.exit(1);
});

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

import { getEnvironment } from "./env.js";

export function getFirebaseAdminAuth(): Auth {
  if (getApps().length === 0) {
    const environment = getEnvironment();
    initializeApp({
      credential: cert({
        projectId: environment.FIREBASE_PROJECT_ID,
        clientEmail: environment.FIREBASE_CLIENT_EMAIL,
        privateKey: environment.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }

  return getAuth();
}

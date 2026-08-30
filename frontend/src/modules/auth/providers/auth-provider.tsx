"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getFirebaseAuth, getFirebaseConfigurationError } from "@/lib/firebase";
import type { AuthContextValue } from "../types/auth.types";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialConfigurationError = getFirebaseConfigurationError();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(initialConfigurationError === null);
  const configurationError = initialConfigurationError
    ? "Firebase authentication has not been configured yet."
    : null;

  useEffect(() => {
    if (initialConfigurationError) {
      return undefined;
    }

    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, [initialConfigurationError]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configurationError,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      },
      signOut: async () => {
        await firebaseSignOut(getFirebaseAuth());
      },
    }),
    [configurationError, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

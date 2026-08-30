import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "@/modules/auth/providers/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Ledger Manager",
  description: "Understand spending, forecast your month, and plan savings goals.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

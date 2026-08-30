import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

/**
 * Two faces, each with a job.
 *
 * Space Grotesk carries the interface and the hero figures: a geometric grotesk
 * with enough character to avoid the anonymous-default look, and tight, even
 * digits that hold up at 64px. JetBrains Mono carries every amount in every
 * table, because money has to be tabular or columns stop aligning on the decimal.
 *
 * Both are self-hosted at build time by next/font, so there is no request to
 * Google at runtime and no layout shift while a face loads.
 */
const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Personal Ledger Manager",
  description:
    "Track a monthly salary against what you actually spend. Read receipts, review every field before saving, forecast the month end, and plan savings pockets with stated DPS returns.",
};

export const viewport: Viewport = {
  themeColor: "#07090c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

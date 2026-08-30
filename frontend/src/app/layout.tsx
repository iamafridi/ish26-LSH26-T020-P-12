import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";

import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

/**
 * Three faces, each with a job: an editorial serif for figures and titles, its
 * companion grotesk for interface text, and a mono for every amount so columns
 * align on the decimal. Self-hosted at build time by next/font, so there is no
 * request to Google at runtime and no layout shift while a face loads.
 */
const serif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Instrument_Sans({
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#12110e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
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

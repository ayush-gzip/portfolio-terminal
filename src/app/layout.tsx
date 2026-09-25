import type { Metadata, Viewport } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url.mjs";

const mono = Share_Tech_Mono({ weight: "400", subsets: ["latin"], variable: "--font-terminal" });

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Ayush Rai — terminal", template: "%s · Ayush Rai" },
  description: "The personal terminal of Ayush Rai: writing, projects, and work, one command at a time.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06090a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable} suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  );
}

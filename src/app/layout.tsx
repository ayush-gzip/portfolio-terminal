import type { Metadata, Viewport } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url.mjs";

const mono = Share_Tech_Mono({ weight: "400", subsets: ["latin"], variable: "--font-terminal" });

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Ayush Rai | terminal", template: "%s · Ayush Rai" },
  description: "I get bored and I build. I get bored a lot.",
  openGraph: {
    title: "Ayush Rai | terminal",
    description: "I get bored and I build. I get bored a lot.",
    url: "/",
    siteName: "Ayush Rai",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Ayush Rai terminal" }],
  },
  twitter: { card: "summary_large_image" },
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

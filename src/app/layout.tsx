import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CookieConsent } from "@/components/legal/CookieConsent";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "HomeServices Direct — Discover Local Experts Near You", template: "%s · HomeServices Direct" },
  description: "Find trusted local plumbers, electricians, handymen and more. Compare rates, browse work galleries and read verified reviews.",
};

export const viewport: Viewport = { themeColor: "#4caf2f", width: "device-width", initialScale: 1 };

// Root layout: document shell + client providers only. Visual chrome (header,
// ad rails, footer) lives in the (site) route group so the admin console and
// the review page can opt out of it.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <Providers>
          {children}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}

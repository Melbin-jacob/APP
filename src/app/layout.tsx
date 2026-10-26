import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { CookieConsent } from "@/components/legal/CookieConsent";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { Providers } from "@/components/providers/Providers";
import { getI18n } from "@/i18n/server";
import { getRates } from "@/server/services/fx";
import "./globals.css";
import { VisitTracker } from "@/components/analytics/VisitTracker";

// Brand typeface for the GetTradePros wordmark (self-hosted, no Google request).
const brandFont = localFont({
  src: "../../node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-brand",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: t("meta.title"), template: "%s · GetTradePros" },
    description: t("meta.description"),
  };
}

export const viewport: Viewport = { themeColor: "#0B2545", width: "device-width", initialScale: 1 };

// Root layout: document shell + client providers only. Visual chrome (header,
// ad rails, footer) lives in the (site) route group so the admin console and
// the review page can opt out of it. Language, direction, currency and the
// visitor's market are resolved per request (see server/visitor.ts).
export default async function RootLayout({ children }: { children: ReactNode }) {
  const [{ messages, visitor }, rates] = await Promise.all([getI18n(), getRates()]);
  return (
    <html lang={visitor.locale} dir={visitor.dir} className={brandFont.variable}>
      <body className="min-h-screen font-sans">
        <PreferencesProvider locale={visitor.locale} currency={visitor.currency} country={visitor.country} rates={rates} messages={messages}>
          <Providers>
            {children}
            <CookieConsent />
            <VisitTracker />
          </Providers>
        </PreferencesProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CookieConsent } from "@/components/legal/CookieConsent";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { Providers } from "@/components/providers/Providers";
import { getI18n } from "@/i18n/server";
import { getRates } from "@/server/services/fx";
import "./globals.css";
import { VisitTracker } from "@/components/analytics/VisitTracker";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: { default: t("meta.title"), template: "%s · HomeServices Direct" },
    description: t("meta.description"),
  };
}

export const viewport: Viewport = { themeColor: "#4caf2f", width: "device-width", initialScale: 1 };

// Root layout: document shell + client providers only. Visual chrome (header,
// ad rails, footer) lives in the (site) route group so the admin console and
// the review page can opt out of it. Language, direction, currency and the
// visitor's market are resolved per request (see server/visitor.ts).
export default async function RootLayout({ children }: { children: ReactNode }) {
  const [{ messages, visitor }, rates] = await Promise.all([getI18n(), getRates()]);
  return (
    <html lang={visitor.locale} dir={visitor.dir}>
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

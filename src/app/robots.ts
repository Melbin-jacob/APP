import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// Public pages are open to search engines; private and form pages aren't
// worth crawling (and some need a sign-in). Business logos under /api/media
// stay crawlable so they can appear in image results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/api/media/"],
      disallow: [
        "/admin", "/api/", "/account", "/dashboard", "/login", "/register", "/start", "/review", "/unsubscribe",
        "/legal/accept-terms", "/traders/*/quote", "/traders/*/claim",
      ],
    }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}

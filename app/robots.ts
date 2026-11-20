import type { MetadataRoute } from "next";

// Disallow only what a crawler should never fetch. /auth and /invitation stay
// crawlable on purpose: some of their URLs carry a secret Token, and they are
// kept out of search results with noindex (app/auth/layout.tsx and
// app/invitation/layout.tsx), which a crawler only sees if it may fetch the
// page. A disallowed URL can still be listed in results when linked elsewhere.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/api"] },
  };
}

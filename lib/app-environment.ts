export type AppEnvironment = "local" | "staging" | "production";

// The one source of truth for which environment the app runs in. Staging and
// production both run with NODE_ENV=production, so they're told apart by the
// APP_ENV runtime variable. Never throws: an unset or unknown APP_ENV counts
// as production so builds, CI and tests work without it.
export function getAppEnvironment(): AppEnvironment {
  if (process.env.NODE_ENV === "development") return "local";
  if (process.env.APP_ENV?.trim() === "staging") return "staging";
  return "production";
}

export function appTitle(environment: AppEnvironment) {
  const label = environment === "production" ? "" : `[${environment}] `;

  return {
    default: `${label}Sjung`,
    template: `${label}%s · Sjung`,
  };
}

// Production gets the navy icon; staging and local share the amber one so a
// non-production tab stands out even when its title is cut off. The .ico is a
// fallback for browsers without SVG favicons.
export function appIcons(environment: AppEnvironment) {
  const variant = environment === "production" ? "production" : "staging";
  const ico =
    variant === "production" ? "/favicon.ico" : `/icons/${variant}/favicon.ico`;

  return {
    icon: [
      { url: ico, sizes: "16x16 32x32 48x48" },
      { url: `/icons/${variant}/icon.svg`, type: "image/svg+xml" },
    ],
    apple: `/icons/${variant}/apple-icon.png`,
  };
}

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

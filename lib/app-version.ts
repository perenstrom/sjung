import packageJson from "@/package.json";
import { getAppEnvironment } from "@/lib/app-environment";

const SHORT_COMMIT_LENGTH = 7;

/**
 * Which version of Sjung is running, as shown after "Version" in the sidebar
 * and in Feedback emails: the package.json version (bumped by release-please),
 * plus the short deployed commit on staging (from the APP_COMMIT runtime
 * variable, when set) or "lokal" under `npm run dev`. Production only ever
 * runs release commits, so it shows the version alone. Server-only: reads
 * process.env at request time.
 */
export function appVersion(): string {
  const { version } = packageJson;

  switch (getAppEnvironment()) {
    case "local":
      return `${version} · lokal`;
    case "staging": {
      const commit = process.env.APP_COMMIT?.trim().slice(0, SHORT_COMMIT_LENGTH);
      return commit ? `${version} · ${commit}` : version;
    }
    case "production":
      return version;
  }
}

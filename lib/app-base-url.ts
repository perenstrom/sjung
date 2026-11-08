// Links in emails are built from APP_BASE_URL, never from the request's Host or
// x-forwarded-* headers: a spoofed Host would put an attacker's domain into a
// real email.
function getAppBaseUrl(): URL {
  const value = process.env.APP_BASE_URL?.trim();
  if (!value) {
    throw new Error("Saknar miljövariabel: APP_BASE_URL");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Ogiltig APP_BASE_URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Ogiltig APP_BASE_URL");
  }
  return url;
}

/** An absolute URL to `path` in this app, for use in emails. */
export function appUrl(path: string, searchParams: Record<string, string> = {}): string {
  const url = new URL(path, getAppBaseUrl());
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

import { cookies } from "next/headers";

export const ACTIVE_GROUP_COOKIE_NAME = "active_group_slug";
const ACTIVE_GROUP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function cookieOptions() {
  return {
    path: "/",
    maxAge: ACTIVE_GROUP_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function getActiveGroupSlugCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACTIVE_GROUP_COOKIE_NAME)?.value?.trim();
  return value ? value : null;
}

export async function setActiveGroupSlugCookie(groupSlug: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GROUP_COOKIE_NAME, groupSlug, cookieOptions());
}

export async function clearActiveGroupSlugCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_GROUP_COOKIE_NAME);
}

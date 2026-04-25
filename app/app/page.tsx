import { redirect } from "next/navigation";
import { getGroups } from "@/app/actions/groups";
import { requireUser } from "@/lib/auth/require-user";
import { getActiveGroupSlugCookie } from "@/lib/active-group-cookie";

export default async function AppHubPage() {
  await requireUser();
  const groups = await getGroups();

  if (groups.length === 0) {
    redirect("/app/me/groups");
  }

  const activeGroupSlug = await getActiveGroupSlugCookie();
  const cookieGroup = activeGroupSlug
    ? groups.find((group) => group.slug === activeGroupSlug)
    : null;
  const fallbackGroup = groups[0];
  const selectedGroup = cookieGroup ?? fallbackGroup;
  redirect(`/app/${selectedGroup.slug}`);
}

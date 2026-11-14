import { redirect } from "next/navigation";
import { getGroups } from "@/app/actions/groups";
import { requireUser } from "@/lib/auth/require-user";
import { getActiveGroupSlugCookie } from "@/lib/active-group-cookie";
import { MY_GROUPS_PATH } from "@/lib/groups/routes";

export default async function AppHubPage() {
  await requireUser();
  const groups = await getGroups();

  if (groups.length === 0) {
    redirect(MY_GROUPS_PATH);
  }

  const activeGroupSlug = await getActiveGroupSlugCookie();
  const cookieGroup = activeGroupSlug
    ? groups.find((group) => group.slug === activeGroupSlug)
    : null;
  const fallbackGroup = groups[0];
  const selectedGroup = cookieGroup ?? fallbackGroup;
  redirect(`/app/${selectedGroup.slug}`);
}

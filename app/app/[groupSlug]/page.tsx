import { redirect } from "next/navigation";

import { groupSetListsPath } from "@/lib/groups/routes";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

/** A Group's own address: the single place that decides its start page. */
export default async function TenantGroupPage({ params }: PageProps) {
  const { groupSlug } = await params;
  redirect(groupSetListsPath(groupSlug));
}

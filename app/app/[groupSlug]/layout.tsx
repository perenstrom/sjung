import { requireTenantGroup } from "@/lib/tenant-group";

export default async function TenantGroupLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ groupSlug: string }>;
}>) {
  const { groupSlug } = await params;
  await requireTenantGroup(groupSlug);
  return children;
}

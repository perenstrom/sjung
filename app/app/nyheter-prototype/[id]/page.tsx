// PROTOTYPE (PER-430), throwaway: one Announcement, in whichever variant
// ?variant= picks.

import { AnnouncementsPrototype } from "../_prototype/variants";

export default async function AnnouncementPrototypePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const [{ id }, { variant }] = await Promise.all([params, searchParams]);
  return <AnnouncementsPrototype variantParam={variant} selectedId={id} />;
}

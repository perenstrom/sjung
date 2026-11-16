// PROTOTYPE (PER-430), throwaway: three variants of the Announcements reading
// view, switchable via ?variant=A|B|C on /app/nyheter-prototype.

import { AnnouncementsPrototype } from "./_prototype/variants";

export default async function AnnouncementsPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;
  return <AnnouncementsPrototype variantParam={variant} selectedId={null} />;
}

import { getGroupHome, getGroups } from "@/app/actions/groups";
import { getCurrentSetLists } from "@/app/actions/setlists";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditModeProvider } from "@/components/EditModeContext";
import { PageHeader } from "@/components/PageHeader";
import { CoverImageSection } from "@/components/home/CoverImageSection";
import { CurrentSetListsSection } from "@/components/home/CurrentSetListsSection";
import { GroupDescriptionSection } from "@/components/home/GroupDescriptionSection";
import { GROUP_HOME_CAPABILITIES } from "@/lib/edit-mode";
import { formatDate } from "@/lib/format-date";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

/**
 * A Group's Home, at the Group's own address: what every Member sees first.
 * A one-column stack of sections, each deciding for itself whether it shows;
 * the same for every Member. Edit mode only changes the Cover image and the
 * Group description.
 */
export default async function TenantGroupPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const [{ description, coverImageHref, canChange }, currentSetLists, groups] = await Promise.all([
    getGroupHome(groupSlug),
    getCurrentSetLists(groupSlug),
    getGroups(),
  ]);
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <EditModeProvider capabilities={canChange ? GROUP_HOME_CAPABILITIES : []}>
      <div className="space-y-4 md:space-y-6">
        {/* Home is the Group's root, the page every other Group page's first crumb leads to. */}
        <BreadcrumbRegistrar
          trail={{ visibility: "visible", ancestors: [], tail: { kind: "static", label: groupName } }}
        />
        <CoverImageSection groupSlug={groupSlug} href={coverImageHref} />
        <PageHeader title="Hem" />
        <GroupDescriptionSection
          groupSlug={groupSlug}
          description={description}
          hasCoverImage={coverImageHref !== null}
        />
        <CurrentSetListsSection
          groupSlug={groupSlug}
          setLists={currentSetLists.map(({ date, ...setList }) => ({ ...setList, dateLabel: formatDate(date) }))}
        />
      </div>
    </EditModeProvider>
  );
}

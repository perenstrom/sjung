import { getGroupHome, getGroups } from "@/app/actions/groups";
import { getCurrentSetLists } from "@/app/actions/setlists";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditModeProvider } from "@/components/EditModeContext";
import { PageHeader } from "@/components/PageHeader";
import { CoverImageSection } from "@/components/home/CoverImageSection";
import { CurrentSetListsSection } from "@/components/home/CurrentSetListsSection";
import { GroupDescriptionAndLinks } from "@/components/home/GroupDescriptionAndLinks";
import { GROUP_HOME_CAPABILITIES } from "@/lib/edit-mode";
import { formatDate } from "@/lib/format-date";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

/**
 * A Group's Home, at the Group's own address: what every Member sees first,
 * headed by the Group's name.
 * A stack of sections, each deciding for itself whether it shows, with the
 * Group links beside the description where the column is wide enough; the
 * same for every Member. Edit mode only changes the Cover image, the Group
 * description and the Group links.
 */
export default async function TenantGroupPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const [{ description, coverImageHref, links, canChange }, currentSetLists, groups] = await Promise.all([
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
        {/* Positioned, so it stacks above the Cover image's fade, which pulls it up. */}
        <div className="relative space-y-4 md:space-y-6">
          <PageHeader title={groupName} />
          <GroupDescriptionAndLinks
            groupSlug={groupSlug}
            description={description}
            hasCoverImage={coverImageHref !== null}
            links={links}
          />
          <CurrentSetListsSection
            groupSlug={groupSlug}
            setLists={currentSetLists.map(({ date, ...setList }) => ({ ...setList, dateLabel: formatDate(date) }))}
          />
        </div>
      </div>
    </EditModeProvider>
  );
}

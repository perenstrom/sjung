import { notFound } from "next/navigation";

import { getGroups } from "@/app/actions/groups";
import { getPersonDetail } from "@/app/actions/people";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { PersonPiecesList } from "@/components/people/PersonPiecesList";
import { createGroupAncestor, createPeopleAncestor } from "@/lib/breadcrumbs";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
};

/** One Person: the Pieces they are credited on, open to every Member. */
export default async function TenantPersonPage({ params }: PageProps) {
  const { groupSlug, id } = await params;
  const [person, groups] = await Promise.all([getPersonDetail(groupSlug, id), getGroups()]);

  if (!person) {
    notFound();
  }
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <div className="space-y-4 md:space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [createGroupAncestor(groupSlug, groupName), createPeopleAncestor(groupSlug)],
          tail: { kind: "static", label: person.name },
        }}
      />
      {/* Nothing here is editable, so no PageHeader and its edit mode toggle. */}
      <h1 className="text-2xl font-semibold break-words">{person.name}</h1>
      <PersonPiecesList groupSlug={groupSlug} pieces={person.pieces} />
    </div>
  );
}

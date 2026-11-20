import { notFound } from "next/navigation";

import { getGroups } from "@/app/actions/groups";
import { getPeople, getPersonDetail } from "@/app/actions/people";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditModeProvider } from "@/components/EditModeContext";
import { PageHeader } from "@/components/PageHeader";
import { DeletePersonDialog } from "@/components/people/DeletePersonDialog";
import { PersonPiecesList } from "@/components/people/PersonPiecesList";
import { RenamePersonDialog } from "@/components/people/RenamePersonDialog";
import { createGroupAncestor, createPeopleAncestor } from "@/lib/breadcrumbs";
import { findGroupAccess } from "@/lib/group-access";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
};

/** One Person: the Pieces they are credited on, open to every Member. Content managers rename or delete them here. */
export default async function TenantPersonPage({ params }: PageProps) {
  const { groupSlug, id } = await params;
  const [person, people, groups, access] = await Promise.all([
    getPersonDetail(groupSlug, id),
    getPeople(groupSlug),
    getGroups(),
    findGroupAccess(groupSlug),
  ]);

  if (!person) {
    notFound();
  }
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <EditModeProvider canEdit={access?.can("manageContent") ?? false}>
      <div className="space-y-4 md:space-y-6">
        <BreadcrumbRegistrar
          trail={{
            visibility: "visible",
            ancestors: [createGroupAncestor(groupSlug, groupName), createPeopleAncestor(groupSlug)],
            tail: { kind: "static", label: person.name },
          }}
        />
        <PageHeader
          title={person.name}
          editActions={
            <>
              <RenamePersonDialog
                groupSlug={groupSlug}
                person={person}
                people={people.map(({ id, name }) => ({ id, name }))}
              />
              <DeletePersonDialog groupSlug={groupSlug} person={person} />
            </>
          }
        />
        <PersonPiecesList groupSlug={groupSlug} pieces={person.pieces} />
      </div>
    </EditModeProvider>
  );
}

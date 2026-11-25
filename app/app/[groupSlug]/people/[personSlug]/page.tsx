import { notFound, permanentRedirect } from "next/navigation";

import { getGroups } from "@/app/actions/groups";
import { getPeople, getPersonDetail } from "@/app/actions/people";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditModeProvider } from "@/components/EditModeContext";
import { PageHeader } from "@/components/PageHeader";
import { DeletePersonDialog } from "@/components/people/DeletePersonDialog";
import { PersonPiecesList } from "@/components/people/PersonPiecesList";
import { RenamePersonDialog } from "@/components/people/RenamePersonDialog";
import { createGroupAncestor, createPeopleAncestor } from "@/lib/breadcrumbs";
import { findPageContent } from "@/lib/content-page";
import { findGroupAccess } from "@/lib/group-access";
import { heldEditCapabilities } from "@/lib/edit-mode";
import { groupPersonPath } from "@/lib/groups/routes";

type PageProps = {
  params: Promise<{ groupSlug: string; personSlug: string }>;
};

/** One Person: the Pieces they are credited on, open to every Member. Content managers rename or delete them here. */
export default async function TenantPersonPage({ params }: PageProps) {
  const { groupSlug, personSlug } = await params;
  const match = await findPageContent(groupSlug, "person", personSlug);
  // A link by id always works and moves to the Slug URL (ADR-0011).
  if (match.slug !== personSlug) {
    permanentRedirect(groupPersonPath(groupSlug, match));
  }
  const [person, people, groups, access] = await Promise.all([
    getPersonDetail(groupSlug, match.id),
    getPeople(groupSlug),
    getGroups(),
    findGroupAccess(groupSlug),
  ]);

  if (!person) {
    notFound();
  }
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <EditModeProvider capabilities={heldEditCapabilities(access, ["manageContent"])}>
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

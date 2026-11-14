import { getPieces } from "@/app/actions/pieces";
import { getPeople } from "@/app/actions/people";
import { CreatePieceDialog } from "@/components/CreatePieceDialog";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditModeProvider } from "@/components/EditModeContext";
import { findGroupAccess } from "@/lib/group-access";
import { PageHeader } from "@/components/PageHeader";
import { PiecesTable } from "@/components/pieces/PiecesTable";
import { getGroups } from "@/app/actions/groups";
import { createGroupAncestor } from "@/lib/breadcrumbs";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

export default async function TenantNoterPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const [pieces, people, groups, access] = await Promise.all([
    getPieces(groupSlug),
    getPeople(groupSlug),
    getGroups(),
    findGroupAccess(groupSlug),
  ]);
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <EditModeProvider canEdit={access?.can("manageContent") ?? false}>
      <div className="space-y-4 md:space-y-6">
        <BreadcrumbRegistrar
          trail={{
            visibility: "visible",
            ancestors: [createGroupAncestor(groupSlug, groupName)],
            tail: { kind: "static", label: "Noter" },
          }}
        />
        <PageHeader
          title="Noter"
          editActions={<CreatePieceDialog people={people} groupSlug={groupSlug} />}
        />

        <PiecesTable pieces={pieces} people={people} groupSlug={groupSlug} />
      </div>
    </EditModeProvider>
  );
}

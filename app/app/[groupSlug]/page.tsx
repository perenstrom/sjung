import { getPieces } from "@/app/actions/pieces";
import { getPeople } from "@/app/actions/people";
import { CreatePieceDialog } from "@/components/CreatePieceDialog";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { PiecesTable } from "@/components/pieces/PiecesTable";
import { getGroups } from "@/app/actions/groups";
import { createGroupAncestor } from "@/lib/breadcrumbs";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

export default async function TenantNoterPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const [pieces, people, groups] = await Promise.all([
    getPieces(groupSlug),
    getPeople(groupSlug),
    getGroups(),
  ]);
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <div className="space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [createGroupAncestor(groupSlug, groupName)],
          tail: { kind: "static", label: "Noter" },
        }}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Noter</h1>
        <CreatePieceDialog people={people} groupSlug={groupSlug} />
      </div>

      <PiecesTable pieces={pieces} people={people} groupSlug={groupSlug} />
    </div>
  );
}

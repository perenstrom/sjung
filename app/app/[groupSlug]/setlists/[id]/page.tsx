import {
  addPieceToSetList,
  appendSetListNote,
  getSetListDetail,
  getSetListPieceOptions,
} from "@/app/actions/setlists";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { SetListStepsTable } from "@/components/setlists/SetListStepsTable";
import { SetListPiecePicker } from "@/components/SetListPiecePicker";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
};

function formatSetListDate(date: Date | null): string {
  if (!date) {
    return "–";
  }
  return new Intl.DateTimeFormat("sv-SE").format(date);
}

export default async function TenantSetListDetailPage({ params }: PageProps) {
  const { groupSlug, id } = await params;
  const [setList, pieces, groups] = await Promise.all([
    getSetListDetail(groupSlug, id),
    getSetListPieceOptions(groupSlug),
    getGroups(),
  ]);

  if (!setList) {
    notFound();
  }
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <div className="space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [
            createGroupAncestor(groupSlug, groupName),
            { label: "Repertoarer", href: `/app/${groupSlug}/setlists` },
          ],
          tail: { kind: "static", label: setList.name || "Repertoar" },
        }}
      />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{setList.name}</h1>
        <p className="text-sm text-muted-foreground">Datum: {formatSetListDate(setList.date)}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Lägg till stycke</h2>
        <form action={addPieceToSetList} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="setListId" value={setList.id} />
          <div className="sm:w-80">
            <SetListPiecePicker pieces={pieces} />
          </div>
          <Button type="submit" disabled={pieces.length === 0}>
            Lägg till
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Lägg till anteckning</h2>
        <form action={appendSetListNote} className="space-y-3">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="setListId" value={setList.id} />
          <label className="block space-y-2">
            <span className="text-sm font-medium">Lägg till anteckning</span>
            <textarea
              name="content"
              required
              rows={4}
              className={cn(
                "border-input placeholder:text-muted-foreground flex min-h-[6rem] w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              )}
            />
          </label>
          <Button type="submit">Lägg till anteckning</Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Ordning</h2>
        <SetListStepsTable
          steps={setList.steps}
          groupSlug={groupSlug}
          setListId={setList.id}
        />
      </section>
    </div>
  );
}

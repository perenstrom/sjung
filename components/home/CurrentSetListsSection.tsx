import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { MobileList, MobileListRow } from "@/components/ui/mobile-list";
import { groupSetListPath, groupSetListsPath } from "@/lib/groups/routes";
import { formatPieceCount } from "@/lib/pieces/count";

export type CurrentSetListRow = {
  id: string;
  slug: string;
  name: string;
  /** Formatted on the server, like the Repertoarer list's. Null when the Set list has no date. */
  dateLabel: string | null;
  pieceCount: number;
};

/**
 * Home's Current Set lists, in the order given: one row each, opening the Set
 * list. Unlike most sections it never hides: with nothing Current it says so,
 * and it always ends with a way to Repertoarer.
 */
export function CurrentSetListsSection({ groupSlug, setLists }: { groupSlug: string; setLists: CurrentSetListRow[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">{setLists.length === 1 ? "Aktuell repertoar" : "Aktuella repertoarer"}</h2>
      {setLists.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen repertoar är aktuell just nu.</p>
      ) : (
        // The Repertoarer list's mobile rows on every width; a bordered, rounded list from `md` up.
        <MobileList className="md:mx-0 md:block md:rounded-md md:border">
          {setLists.map((setList) => (
            <MobileListRow
              key={setList.id}
              href={groupSetListPath(groupSlug, setList)}
              primary={setList.name}
              secondary={[setList.dateLabel, formatPieceCount(setList.pieceCount)].filter(Boolean).join(" · ")}
              trailing={<ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />}
            />
          ))}
        </MobileList>
      )}
      <p>
        <Link href={groupSetListsPath(groupSlug)} className="text-sm underline underline-offset-4">
          Visa alla repertoarer
        </Link>
      </p>
    </section>
  );
}

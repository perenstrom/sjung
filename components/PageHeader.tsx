import { EditOnly } from "@/components/EditModeContext";
import { EditModeToggle } from "@/components/EditModeToggle";

/**
 * Page title with the edit mode toggle pinned to the right. Titles wrap rather
 * than push the toggle off screen. Edit-only actions sit to the left of the
 * toggle from `md` up, and on a second row below it, so the toggle never moves.
 */
export function PageHeader({
  title,
  editActions,
}: {
  title: React.ReactNode;
  editActions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-2">
      <h1 className="min-w-0 flex-1 text-2xl font-semibold break-words md:mr-1">{title}</h1>
      {editActions ? (
        <EditOnly>
          <div className="order-last flex basis-full flex-wrap items-center gap-2 md:order-none md:basis-auto">
            {editActions}
          </div>
        </EditOnly>
      ) : null}
      <EditModeToggle />
    </div>
  );
}

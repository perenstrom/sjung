import { EditOnly } from "@/components/EditModeContext";
import { EditModeToggle } from "@/components/EditModeToggle";

/**
 * Page title with the edit mode toggle pinned to the right. Edit-only actions
 * appear to the left of the toggle, so the toggle never moves.
 */
export function PageHeader({
  title,
  editActions,
}: {
  title: React.ReactNode;
  editActions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        {editActions ? <EditOnly>{editActions}</EditOnly> : null}
        <EditModeToggle />
      </div>
    </div>
  );
}

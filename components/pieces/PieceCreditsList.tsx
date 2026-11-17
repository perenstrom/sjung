import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { type CreditedPerson, type CreditForDisplay, groupCreditsByPerson } from "@/lib/pieces/credits";
import { cn } from "@/lib/utils";

/**
 * A piece's credits, one row per Person (name + a badge per Credit role), in
 * display order. A row that doesn't fit wraps its badges under the name.
 * Callers render their own empty state.
 */
export function PieceCreditsList({
  credits,
  className,
  renderPersonAction,
}: {
  credits: CreditForDisplay[];
  className?: string;
  /** Trailing control at the end of a Person's row, e.g. a remove button. */
  renderPersonAction?: (person: CreditedPerson) => ReactNode;
}) {
  return (
    <ul className={cn("text-sm", className)}>
      {groupCreditsByPerson(credits).map((person) => (
        <li key={person.personId} className="flex min-h-7 items-start gap-2">
          <div className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 font-medium break-words">{person.name}</span>
            {person.roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center rounded-md border border-input bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
              >
                {role}
              </span>
            ))}
          </div>
          {renderPersonAction?.(person)}
        </li>
      ))}
    </ul>
  );
}

/** Removes all of a Person's Credits, at the end of their row in `PieceCreditsList`. */
export function RemoveCreditedPersonButton({
  person,
  onRemove,
  disabled,
}: {
  person: CreditedPerson;
  onRemove: (person: CreditedPerson) => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost-destructive"
      size="icon"
      // The touch-sized target overhangs the name's line instead of pushing it down.
      className="size-7 shrink-0 pointer-coarse:-my-2"
      onClick={() => onRemove(person)}
      disabled={disabled}
      aria-label={`Ta bort ${person.name}`}
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </Button>
  );
}

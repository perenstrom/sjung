import { Trash2, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CreditRoleBadge } from "@/components/pieces/CreditRoleBadge";
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
  personHref,
  renderPersonAction,
  renderRoleAction,
}: {
  credits: CreditForDisplay[];
  className?: string;
  /** Where a Person's name links to. Without it names are plain text, as in Alla noter. */
  personHref?: (personId: string) => string;
  /** Trailing control at the end of a Person's row, e.g. a remove button. */
  renderPersonAction?: (person: CreditedPerson) => ReactNode;
  /** Control inside each Credit role badge, e.g. a remove ✕. */
  renderRoleAction?: (person: CreditedPerson, role: string) => ReactNode;
}) {
  return (
    <ul className={cn("text-sm", className)}>
      {groupCreditsByPerson(credits).map((person) => (
        <li key={person.personId} className="flex min-h-7 items-start gap-2">
          <div className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            {personHref ? (
              <Link href={personHref(person.personId)} className="min-w-0 font-medium break-words underline">
                {person.name}
              </Link>
            ) : (
              <span className="min-w-0 font-medium break-words">{person.name}</span>
            )}
            {person.roles.map((role) => (
              <CreditRoleBadge key={role} role={role} action={renderRoleAction?.(person, role)} />
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

/** Removes one of a Person's Credits, as a ✕ inside its Credit role badge in `PieceCreditsList`. */
export function RemoveCreditRoleButton({
  person,
  role,
  onRemove,
  disabled,
}: {
  person: CreditedPerson;
  role: string;
  onRemove: (person: CreditedPerson, role: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      // A plain button, not `Button`: its smallest size is too big to sit inside a badge.
      // On touch, the invisible ::before widens what a finger can hit: as wide as
      // reaches the bin's gap, and as tall as one wrapped line of badges, so a tap
      // can't land on the ✕ above or below.
      className="relative -mr-1 inline-flex size-4 shrink-0 items-center justify-center rounded-sm hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 pointer-coarse:before:absolute pointer-coarse:before:-inset-x-3 pointer-coarse:before:-inset-y-[5px]"
      onClick={() => onRemove(person, role)}
      disabled={disabled}
      aria-label={`Ta bort rollen ${role} från ${person.name}`}
    >
      <X className="size-3" aria-hidden="true" />
    </button>
  );
}

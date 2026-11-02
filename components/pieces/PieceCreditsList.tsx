import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { type CreditForDisplay, groupCreditsByPerson } from "@/lib/pieces/credits";
import { cn } from "@/lib/utils";

/**
 * A piece's credits, one row per Person (name + a badge per Credit role), in
 * display order. Callers render their own empty state.
 */
export function PieceCreditsList({
  credits,
  className,
  renderRoleAction,
}: {
  credits: CreditForDisplay[];
  className?: string;
  /** Trailing control inside a role badge, e.g. a remove button. */
  renderRoleAction?: (credit: CreditForDisplay) => ReactNode;
}) {
  return (
    <ul className={cn("text-sm", className)}>
      {groupCreditsByPerson(credits).map((person) => (
        <li
          key={person.personId}
          className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap"
        >
          <span className="font-medium">{person.name}</span>
          {person.roles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {role}
              {renderRoleAction?.({
                personId: person.personId,
                role,
                person: { name: person.name },
              })}
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}

/** The remove control for a role badge in `PieceCreditsList`. */
export function RemoveCreditRoleButton({
  credit,
  onRemove,
  disabled,
}: {
  credit: CreditForDisplay;
  onRemove: (credit: CreditForDisplay) => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="-mr-1 size-4 rounded-sm"
      onClick={() => onRemove(credit)}
      disabled={disabled}
      aria-label={`Ta bort ${credit.person.name} som ${credit.role}`}
    >
      <X className="size-3" aria-hidden="true" />
    </Button>
  );
}

import type { ReactNode } from "react";

import { creditKey, sortCreditsForDisplay } from "@/lib/pieces/credits";
import { cn } from "@/lib/utils";

type ListedCredit = { personId: string; role: string; person: { name: string } };

/**
 * A piece's credits, one row each (person name + role badge), in display
 * order. Callers render their own empty state.
 */
export function PieceCreditsList<T extends ListedCredit>({
  credits,
  className,
  renderAction,
}: {
  credits: T[];
  className?: string;
  /** Trailing control for a row, e.g. a remove button. */
  renderAction?: (credit: T) => ReactNode;
}) {
  return (
    <ul className={cn("text-sm", className)}>
      {sortCreditsForDisplay(credits).map((credit) => (
        <li
          key={creditKey(credit)}
          className="flex min-h-7 items-center gap-2"
        >
          <span className="font-medium">{credit.person.name}</span>
          <span className="inline-flex items-center rounded-md border border-input bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
            {credit.role}
          </span>
          {renderAction?.(credit)}
        </li>
      ))}
    </ul>
  );
}

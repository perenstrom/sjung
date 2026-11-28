import type { ReactNode } from "react";

/** One Credit role, as a small muted badge next to a name, optionally ending in a control such as a remove ✕. */
export function CreditRoleBadge({ role, action }: { role: string; action?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-input bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
      {role}
      {action}
    </span>
  );
}

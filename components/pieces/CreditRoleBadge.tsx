/** One Credit role, as a small muted badge next to a name. */
export function CreditRoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-input bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
      {role}
    </span>
  );
}

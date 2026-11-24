import { Badge } from "@/components/ui/badge";

/**
 * A Set list's name, followed by an Aktuell badge when it is Current
 * (CONTEXT.md, "Current"). `children` is the name as the caller shows it:
 * plain text, a link or a truncating span.
 */
export function SetListName({ current, children }: { current: boolean; children: React.ReactNode }) {
  if (!current) {
    return children;
  }
  return (
    <span className="inline-flex max-w-full items-center gap-2">
      {children}
      <Badge variant="secondary">Aktuell</Badge>
    </span>
  );
}

import { cn } from "@/lib/utils";

/** The blue dot that marks something unread. Decorative: pair it with text for screen readers. */
export function UnreadDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-2 shrink-0 rounded-full bg-blue-500", className)} />;
}

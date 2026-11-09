import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  /** A lucide icon, shown muted above the heading. */
  icon: LucideIcon
  heading: React.ReactNode
  /** Body copy below the heading. */
  children: React.ReactNode
  /** Optional call to action, e.g. a button. */
  action?: React.ReactNode
  className?: string
}

/**
 * Shown in place of a list or table that has nothing in it yet: an icon, a
 * heading, a short explanation and, optionally, what to do about it.
 */
function EmptyState({ icon: Icon, heading, children, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-12 text-center",
        className
      )}
    >
      <Icon className="text-muted-foreground size-10" aria-hidden="true" />
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{heading}</h2>
        <div className="text-muted-foreground text-sm">{children}</div>
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  )
}

export { EmptyState }

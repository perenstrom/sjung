import * as React from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The shared list used by every list view below `md` (desktop keeps its
 * tables). It runs edge to edge, pulled out of the 16px page gutter (`px-4` on
 * <main> in app/app/layout.tsx), with rows joined by hairlines and no header
 * row. Hidden from `md` up, so a page renders it next to its table.
 */
function MobileList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="mobile-list"
      className={cn("-mx-4 divide-y border-y md:hidden", className)}
      {...props}
    />
  )
}

/** The one muted line an empty list shows instead of rows. */
function MobileListEmpty({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="mobile-list-empty"
      className={cn("text-muted-foreground px-4 py-3 text-sm", className)}
      {...props}
    />
  )
}

type MobileListRowProps = {
  /** One line, truncated. */
  primary: React.ReactNode
  /** Optional one line below the primary line, truncated. Omit rather than pass a placeholder. */
  secondary?: React.ReactNode
  /** Trailing slot, e.g. a chevron, badges or icon buttons. */
  trailing?: React.ReactNode
  /**
   * Makes the whole row a link (at least 56px tall). Trailing content stays
   * above the link, so icon buttons there remain their own tap targets.
   * Without it the row is static text, at least 44px tall.
   */
  href?: string
  /** Extra content below the text lines, e.g. a wrapping line of badges. */
  children?: React.ReactNode
  className?: string
}

function MobileListRow({
  primary,
  secondary,
  trailing,
  href,
  children,
  className,
}: MobileListRowProps) {
  const textLines = (
    <>
      <span className="block truncate">{primary}</span>
      {secondary ? (
        <span className="text-muted-foreground block truncate text-sm">{secondary}</span>
      ) : null}
    </>
  )

  return (
    <li
      data-slot="mobile-list-row"
      className={cn(
        "relative flex items-center gap-2 px-4",
        href ? "has-[a:active]:bg-muted/50 min-h-14 py-2" : "min-h-11 py-2.5",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {href ? (
          // The link stretches over the whole row, so the full row is its tap target.
          <Link
            href={href}
            className="focus-visible:after:ring-ring/50 block outline-none after:absolute after:inset-0 focus-visible:after:ring-[3px] focus-visible:after:ring-inset"
          >
            {textLines}
          </Link>
        ) : (
          textLines
        )}
        {children}
      </div>
      {trailing ? (
        <div className="relative flex shrink-0 items-center gap-1">{trailing}</div>
      ) : null}
    </li>
  )
}

type MobileListExpandableRowProps = {
  /** Optional content before the text lines, e.g. a running-order number. */
  leading?: React.ReactNode
  /** One line, truncated while closed and shown in full when open. */
  primary: React.ReactNode
  /** Optional line below the primary line, truncated while closed. Omit rather than pass a placeholder. */
  secondary?: React.ReactNode
  /** Non-interactive trailing content shown before the chevron, e.g. counts. */
  trailing?: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What the row shows below its summary when open. Unmounted while closed. */
  children: React.ReactNode
  className?: string
}

/**
 * A row that opens in place. The whole summary (at least 56px tall) is one
 * button that toggles it; the opened content sits below, inset like the text.
 */
function MobileListExpandableRow({
  leading,
  primary,
  secondary,
  trailing,
  open,
  onOpenChange,
  children,
  className,
}: MobileListExpandableRowProps) {
  const panelId = React.useId()

  return (
    <li data-slot="mobile-list-expandable-row" className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className="focus-visible:ring-ring/50 active:bg-muted/50 flex min-h-14 w-full items-center gap-2 px-4 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span className={cn("block", !open && "truncate")}>{primary}</span>
          {secondary ? (
            <span
              className={cn("text-muted-foreground block text-sm", !open && "truncate")}
            >
              {secondary}
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
          {trailing}
          {/* Rotate a wrapper, not the svg: Safari ignores `rotate` on svg elements. */}
          <span
            className={cn("inline-flex transition-transform", open && "rotate-180")}
            aria-hidden="true"
          >
            <ChevronDown className="size-4" />
          </span>
        </span>
      </button>
      {open ? (
        <div id={panelId} className="space-y-3 px-4 pb-4">
          {children}
        </div>
      ) : null}
    </li>
  )
}

export { MobileList, MobileListEmpty, MobileListExpandableRow, MobileListRow }

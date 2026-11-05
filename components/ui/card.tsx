import * as React from "react"

import { cn } from "@/lib/utils"

// A section card is a page section (e.g. Filer on Piece detail). Below `md` it
// runs flush to the screen edges, pulled out of the 16px page gutter (`px-4` on
// <main> in app/app/layout.tsx), and consecutive section cards share a hairline
// instead of a gap — which needs them to be direct DOM siblings. Other cards (e.g. the auth
// forms) stay rounded cards within the gutter.
const SECTION_CARD_CLASS =
  "max-md:-mx-4 max-md:gap-3 max-md:rounded-none max-md:border-x-0 max-md:py-4 max-md:shadow-none max-md:has-[+[data-variant=section]]:mb-0 max-md:has-[+[data-variant=section]]:border-b-0"

// Card parts read the variant from the enclosing card, so they get the 16px
// mobile padding without each section repeating it.
const SECTION_CARD_PART_CLASS =
  "group-data-[variant=section]/card:max-md:px-4 group-data-[variant=section]/card:max-md:[.border-b]:pb-4 group-data-[variant=section]/card:max-md:[.border-t]:pt-4"

function Card({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "default" | "section" }) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(
        "group/card bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        variant === "section" && SECTION_CARD_CLASS,
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        SECTION_CARD_PART_CLASS,
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-semibold leading-none", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", SECTION_CARD_PART_CLASS, className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-6 [.border-t]:pt-6",
        SECTION_CARD_PART_CLASS,
        className
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }

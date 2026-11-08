"use client"

import * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const FormPopoverAsDialogContext = React.createContext(false)

/**
 * A small form that opens from a trigger: a popover from `md` up, and the
 * top-pinned mobile dialog (see `DialogContent`) below it, so the form stays
 * usable with the on-screen keyboard open. Same parts either way:
 *
 * ```tsx
 * <FormPopover open={open} onOpenChange={setOpen}>
 *   <FormPopoverTrigger asChild><Button>…</Button></FormPopoverTrigger>
 *   <FormPopoverContent title="Lägg till länk" description={pieceName}>
 *     <form>
 *       …fields…
 *       <FormPopoverFooter>…buttons…</FormPopoverFooter>
 *     </form>
 *   </FormPopoverContent>
 * </FormPopover>
 * ```
 */
function FormPopover({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const asDialog = useIsMobile()
  const Root = asDialog ? Dialog : Popover

  return (
    <FormPopoverAsDialogContext.Provider value={asDialog}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </FormPopoverAsDialogContext.Provider>
  )
}

function FormPopoverTrigger(
  props: React.ComponentProps<typeof PopoverTrigger>
) {
  const asDialog = React.useContext(FormPopoverAsDialogContext)
  return asDialog ? <DialogTrigger {...props} /> : <PopoverTrigger {...props} />
}

function FormPopoverContent({
  title,
  description,
  children,
}: {
  title: string
  /** One muted line under the title, e.g. the piece the form acts on. */
  description: React.ReactNode
  children: React.ReactNode
}) {
  const asDialog = React.useContext(FormPopoverAsDialogContext)

  if (asDialog) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    )
  }

  return (
    <PopoverContent align="start" className="w-80 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </PopoverContent>
  )
}

/**
 * The form's action row. In the mobile dialog it sticks to the bottom while the
 * body scrolls, which only holds while it is the last thing in the content.
 */
function FormPopoverFooter({ children }: { children: React.ReactNode }) {
  const asDialog = React.useContext(FormPopoverAsDialogContext)
  return asDialog ? (
    <DialogFooter>{children}</DialogFooter>
  ) : (
    <div className="flex justify-end gap-2">{children}</div>
  )
}

export {
  FormPopover,
  FormPopoverContent,
  FormPopoverFooter,
  FormPopoverTrigger,
}

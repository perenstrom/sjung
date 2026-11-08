import * as React from "react"

/**
 * Open state for a dialog or popover that its caller may control. Without an
 * `open` prop it keeps its own state; with one it follows the caller and only
 * reports changes through `onOpenChange`. `onClose` runs on every close, e.g.
 * to clear an error message.
 */
export function useControllableOpen({
  open: openControlled,
  onOpenChange,
  onClose,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
}) {
  const [openInternal, setOpenInternal] = React.useState(false)
  const isControlled = openControlled !== undefined
  const open = isControlled ? openControlled : openInternal

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setOpenInternal(nextOpen)
      }
      onOpenChange?.(nextOpen)
      if (!nextOpen) {
        onClose?.()
      }
    },
    [isControlled, onOpenChange, onClose]
  )

  return { open, setOpen, isControlled }
}

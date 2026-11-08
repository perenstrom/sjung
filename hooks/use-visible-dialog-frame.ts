import * as React from "react"

import { dialogFrame, revealScrollDelta } from "@/lib/dialog/dialogFrame"

/**
 * Scrolls the mobile dialog body that holds `element` so the element sits
 * clear of the sticky title and action rows. Does nothing outside a dialog.
 *
 * When the keyboard opens, the focused field is revealed this way, or its
 * closest `[data-dialog-reveal]` ancestor when the field belongs to something
 * larger that should be seen whole, like the inline person picker.
 */
export function revealInDialogBody(element: HTMLElement) {
  const body = element.closest<HTMLElement>("[data-slot=dialog-body]")
  if (!body) return
  body.scrollTop += revealScrollDelta(
    element.getBoundingClientRect(),
    body.getBoundingClientRect()
  )
}

/**
 * Keeps a dialog inside the visible area while the on-screen keyboard is open.
 *
 * The keyboard only shrinks the visual viewport (and on iOS pans it), never
 * the layout viewport that `position: fixed` and `dvh` follow, so the frame
 * is tracked from `visualViewport` and written straight to the element as
 * `--dialog-top` / `--dialog-max-h`. Only the mobile classes read them.
 *
 * Takes the node itself (from a callback ref) because dialog content only
 * mounts while the dialog is open.
 */
export function useVisibleDialogFrame(node: HTMLElement | null) {
  React.useEffect(() => {
    const viewport = window.visualViewport
    if (!node) return

    const update = () => {
      const { top, maxHeight } = dialogFrame({
        height: viewport?.height ?? window.innerHeight,
        offsetTop: viewport?.offsetTop ?? 0,
      })
      node.style.setProperty("--dialog-top", `${top}px`)
      node.style.setProperty("--dialog-max-h", `${maxHeight}px`)
    }

    // When the keyboard opens the dialog shrinks under the focused field;
    // bring it back into view inside the dialog's scrolling body.
    const onResize = () => {
      update()
      const focused = document.activeElement
      if (focused instanceof HTMLElement && node.contains(focused)) {
        revealInDialogBody(
          focused.closest<HTMLElement>("[data-dialog-reveal]") ?? focused
        )
      }
    }

    update()
    if (!viewport) {
      window.addEventListener("resize", onResize)
      return () => window.removeEventListener("resize", onResize)
    }
    viewport.addEventListener("resize", onResize)
    viewport.addEventListener("scroll", update)
    return () => {
      viewport.removeEventListener("resize", onResize)
      viewport.removeEventListener("scroll", update)
    }
  }, [node])
}

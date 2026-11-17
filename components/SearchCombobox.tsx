"use client";

import { ChevronsUpDown } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMergedRefs } from "@/hooks/use-merged-refs";
import {
  DIALOG_REVEAL_ATTRIBUTE,
  revealInDialogBody,
} from "@/lib/dialog/revealInDialogBody";
import { cn } from "@/lib/utils";

export type SearchComboboxProps = {
  /** The picked value's text on the trigger; `placeholder` shows when empty. */
  selectedLabel: string | undefined;
  placeholder: string;
  /** The search, mounted when the picker opens; it closes the picker with `useCloseSearchCombobox`. */
  children: ReactNode;
  className?: string;
  /** Forwarded to the trigger button, e.g. to move focus back to the picker. */
  ref?: React.Ref<HTMLButtonElement>;
  "aria-label"?: string;
};

const CloseContext = createContext<() => void>(() => {});

/** Closes the `SearchCombobox` the calling search sits in, e.g. once a value is picked. */
export function useCloseSearchCombobox(): () => void {
  return useContext(CloseContext);
}

/**
 * A combobox trigger that opens a search (`children`) to pick from.
 *
 * From `md` up the search opens in a popover. Below it the search opens
 * inline, right under the trigger, so inside a dialog its results scroll with
 * the dialog body and stay above the on-screen keyboard.
 */
export function SearchCombobox(props: SearchComboboxProps) {
  return useIsMobile() ? <InlineSearchCombobox {...props} /> : <PopoverSearchCombobox {...props} />;
}

function PopoverSearchCombobox({
  selectedLabel,
  placeholder,
  children,
  className,
  ref,
  "aria-label": ariaLabel,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    // `modal` keeps the list scrollable when the combobox sits inside a Dialog.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <SearchComboboxTrigger
          ref={ref}
          aria-label={ariaLabel}
          aria-expanded={open}
          className={className}
          selectedLabel={selectedLabel}
          placeholder={placeholder}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
      >
        <CloseContext.Provider value={() => setOpen(false)}>{children}</CloseContext.Provider>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The search opens in the page flow as a full-width sibling of the trigger,
 * so in a wrapping flex row it takes a line of its own. A tap outside both,
 * or tabbing away, closes it.
 */
function InlineSearchCombobox({
  selectedLabel,
  placeholder,
  children,
  className,
  ref,
  "aria-label": ariaLabel,
}: SearchComboboxProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const setTriggerRefs = useMergedRefs(triggerRef, ref);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Inside a dialog, scroll the search into view in its body (the keyboard
    // opening reveals it again, see `useVisibleDialogFrame`).
    if (panelRef.current) revealInDialogBody(panelRef.current);

    // iOS doesn't move focus to a tapped button, so a blur can't tell.
    function closeOnTapOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnTapOutside, true);
    return () => document.removeEventListener("pointerdown", closeOnTapOutside, true);
  }, [open]);

  function closeAndRefocusTrigger() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    // `contents` keeps the trigger and the search direct children of the
    // caller's layout, while catching focus moving to another field.
    <div
      className="contents"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <SearchComboboxTrigger
        ref={setTriggerRefs}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={className}
        selectedLabel={selectedLabel}
        placeholder={placeholder}
        onClick={() => setOpen(!open)}
      />
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          {...DIALOG_REVEAL_ATTRIBUTE}
          // Results get 44px tap targets and grow the dialog body, which does
          // the scrolling.
          className="w-full basis-full overflow-hidden rounded-md border **:data-[slot=command-item]:min-h-11 **:data-[slot=command-list]:max-h-none"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeAndRefocusTrigger();
            }
          }}
        >
          <CloseContext.Provider value={closeAndRefocusTrigger}>{children}</CloseContext.Provider>
        </div>
      ) : null}
    </div>
  );
}

function SearchComboboxTrigger({
  selectedLabel,
  placeholder,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  selectedLabel: string | undefined;
  placeholder: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      className={cn("justify-between font-normal", className)}
      {...props}
    >
      <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
        {selectedLabel || placeholder}
      </span>
      <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
    </Button>
  );
}

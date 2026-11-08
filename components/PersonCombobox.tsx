"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { revealInDialogBody } from "@/hooks/use-visible-dialog-frame";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { filterPeople, shouldOfferCreatePerson } from "@/lib/people/person-options";
import { cn } from "@/lib/utils";
import type { Person } from "@/types/piece-credit-dialog";

const CREATE_PERSON_ITEM_VALUE = "__create-person__";

/**
 * Searchable Person picker that can also create a Person from the typed text.
 * `onCreate` owns creating and selecting the new Person; if it throws, the
 * error is shown in the picker and the typed name is kept for another try.
 *
 * From `md` up the search opens in a popover. Below it the search opens
 * inline, right under the trigger, so inside a dialog its results scroll with
 * the dialog body and stay above the on-screen keyboard. Inline, it sits next
 * to the trigger as a full-width sibling, so in a wrapping flex row it takes
 * a line of its own.
 */
export function PersonCombobox({
  people,
  value,
  onValueChange,
  onCreate,
  className,
  ref,
  "aria-label": ariaLabel,
}: {
  people: Person[];
  value: string;
  onValueChange: (personId: string) => void;
  onCreate: (name: string) => Promise<void>;
  className?: string;
  /** Forwarded to the trigger button, e.g. to move focus back to the picker. */
  ref?: React.Ref<HTMLButtonElement>;
  "aria-label"?: string;
}) {
  const inline = useIsMobile();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const selected = people.find((person) => person.id === value);
  const matches = filterPeople(people, query);
  const offerCreate = shouldOfferCreatePerson(people, query);

  // Inline, the search opens in the flow of the dialog body; scroll it into
  // view there (the keyboard opening reveals it again, see the dialog frame).
  useEffect(() => {
    if (inline && open && panelRef.current) revealInDialogBody(panelRef.current);
  }, [inline, open]);

  // Inline, a tap anywhere outside the trigger and the search closes it. iOS
  // doesn't move focus to a tapped button, so a blur alone can't tell.
  useEffect(() => {
    if (!inline || !open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setQuery("");
      setCreateError(null);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [inline, open]);

  const setTriggerRef = useCallback(
    (element: HTMLButtonElement | null) => {
      triggerRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    },
    [ref]
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setCreateError(null);
    }
  }

  /** Closes the inline search and hands focus back to the trigger. */
  function closeInline() {
    handleOpenChange(false);
    triggerRef.current?.focus();
  }

  function close() {
    if (inline) closeInline();
    else handleOpenChange(false);
  }

  function handleSelect(personId: string) {
    onValueChange(personId);
    close();
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      await onCreate(query.trim());
      close();
    } catch (err) {
      setCreateError(getThrownMessage(err, "Kunde inte skapa person"));
    } finally {
      setCreating(false);
    }
  }

  const trigger = (
    <Button
      ref={setTriggerRef}
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      aria-controls={inline && open ? panelId : undefined}
      aria-label={ariaLabel}
      className={cn("justify-between font-normal", className)}
      onClick={inline ? () => handleOpenChange(!open) : undefined}
    >
      <span className={cn("truncate", !selected && "text-muted-foreground")}>
        {selected ? selected.name : "Person"}
      </span>
      <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
    </Button>
  );

  const search = (
    <Command
      shouldFilter={false}
      // Inline means touch: give each result a 44px tap target.
      className={cn(inline && "**:data-[slot=command-item]:min-h-11")}
      onKeyDown={
        inline
          ? (event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeInline();
              }
            }
          : undefined
      }
    >
      <CommandInput
        placeholder="Sök eller skapa person…"
        autoFocus={inline}
        value={query}
        onValueChange={(nextQuery) => {
          setQuery(nextQuery);
          setCreateError(null);
        }}
      />
      {/* Inline, the results grow the dialog body, which does the scrolling. */}
      <CommandList className={cn(inline && "max-h-none")}>
        <CommandEmpty>
          {people.length === 0
            ? "Skriv ett namn för att lägga till en person."
            : "Ingen person hittades."}
        </CommandEmpty>
        {matches.length > 0 && (
          <CommandGroup>
            {matches.map((person) => (
              <CommandItem
                key={person.id}
                value={person.id}
                onSelect={() => handleSelect(person.id)}
              >
                <Check
                  className={cn(
                    "size-4",
                    person.id === value ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden="true"
                />
                {person.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {offerCreate && (
          <CommandGroup>
            <CommandItem
              value={CREATE_PERSON_ITEM_VALUE}
              onSelect={handleCreate}
              disabled={creating}
            >
              <Plus className="size-4" aria-hidden="true" />
              Skapa &quot;{query.trim()}&quot;
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
      {createError ? (
        <p role="alert" className="border-t px-3 py-2 text-sm text-destructive">
          {createError}
        </p>
      ) : null}
    </Command>
  );

  if (inline) {
    return (
      // `contents` keeps the trigger and the search direct children of the
      // caller's layout, while catching focus moving to another field.
      <div
        className="contents"
        onBlur={(event) => {
          const next = event.relatedTarget;
          // Tabbing to another field closes it; taps are handled above.
          if (open && next && !event.currentTarget.contains(next)) {
            handleOpenChange(false);
          }
        }}
      >
        {trigger}
        {open ? (
          <div
            ref={panelRef}
            id={panelId}
            data-dialog-reveal
            className="w-full basis-full overflow-hidden rounded-md border"
          >
            {search}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    // `modal` keeps the list scrollable when the combobox sits inside a Dialog.
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
      >
        {search}
      </PopoverContent>
    </Popover>
  );
}

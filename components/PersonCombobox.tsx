"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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
import { useMergedRefs } from "@/hooks/use-merged-refs";
import {
  DIALOG_REVEAL_ATTRIBUTE,
  revealInDialogBody,
} from "@/lib/dialog/revealInDialogBody";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { filterPeople, shouldOfferCreatePerson } from "@/lib/people/person-options";
import { cn } from "@/lib/utils";
import type { Person } from "@/types/piece-credit-dialog";

const CREATE_PERSON_ITEM_VALUE = "__create-person__";

type PersonComboboxProps = {
  people: Person[];
  value: string;
  onValueChange: (personId: string) => void;
  onCreate: (name: string) => Promise<void>;
  className?: string;
  /** Forwarded to the trigger button, e.g. to move focus back to the picker. */
  ref?: React.Ref<HTMLButtonElement>;
  "aria-label"?: string;
};

/**
 * Searchable Person picker that can also create a Person from the typed text.
 * `onCreate` owns creating and selecting the new Person; if it throws, the
 * error is shown in the picker and the typed name is kept for another try.
 *
 * From `md` up the search opens in a popover. Below it the search opens
 * inline, right under the trigger, so inside a dialog its results scroll with
 * the dialog body and stay above the on-screen keyboard.
 */
export function PersonCombobox(props: PersonComboboxProps) {
  return useIsMobile() ? (
    <InlinePersonCombobox {...props} />
  ) : (
    <PopoverPersonCombobox {...props} />
  );
}

function PopoverPersonCombobox({
  people,
  value,
  onValueChange,
  onCreate,
  className,
  ref,
  "aria-label": ariaLabel,
}: PersonComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    // `modal` keeps the list scrollable when the combobox sits inside a Dialog.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <PersonTrigger
          ref={ref}
          aria-label={ariaLabel}
          aria-expanded={open}
          className={className}
          selected={people.find((person) => person.id === value)}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
      >
        <PersonSearch
          people={people}
          value={value}
          onCreate={onCreate}
          onDone={(personId) => {
            if (personId) onValueChange(personId);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * The search opens in the page flow as a full-width sibling of the trigger,
 * so in a wrapping flex row it takes a line of its own. A tap outside both,
 * or tabbing away, closes it.
 */
function InlinePersonCombobox({
  people,
  value,
  onValueChange,
  onCreate,
  className,
  ref,
  "aria-label": ariaLabel,
}: PersonComboboxProps) {
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
      <PersonTrigger
        ref={setTriggerRefs}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={className}
        selected={people.find((person) => person.id === value)}
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
          <PersonSearch
            people={people}
            value={value}
            onCreate={onCreate}
            onDone={(personId) => {
              if (personId) onValueChange(personId);
              closeAndRefocusTrigger();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function PersonTrigger({
  selected,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { selected: Person | undefined }) {
  return (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      className={cn("justify-between font-normal", className)}
      {...props}
    >
      <span className={cn("truncate", !selected && "text-muted-foreground")}>
        {selected ? selected.name : "Person"}
      </span>
      <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
    </Button>
  );
}

/**
 * The search field and its results. Mounts when the picker opens, so the
 * typed text and any create error start fresh each time.
 */
function PersonSearch({
  people,
  value,
  onCreate,
  onDone,
}: {
  people: Person[];
  value: string;
  onCreate: (name: string) => Promise<void>;
  /** A Person was picked (their id), or created and selected by `onCreate` (no id). */
  onDone: (personId?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const matches = filterPeople(people, query);
  const offerCreate = shouldOfferCreatePerson(people, query);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      await onCreate(query.trim());
      onDone();
    } catch (err) {
      setCreateError(getThrownMessage(err, "Kunde inte skapa person"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Sök eller skapa person…"
        autoFocus
        value={query}
        onValueChange={(nextQuery) => {
          setQuery(nextQuery);
          setCreateError(null);
        }}
      />
      <CommandList>
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
                onSelect={() => onDone(person.id)}
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
}

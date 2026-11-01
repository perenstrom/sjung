"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";

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
import { getThrownMessage } from "@/lib/getThrownMessage";
import { filterPeople, shouldOfferCreatePerson } from "@/lib/people/person-options";
import { cn } from "@/lib/utils";
import type { Person } from "@/types/piece-credit-dialog";

const CREATE_PERSON_ITEM_VALUE = "__create-person__";

/**
 * Searchable Person picker that can also create a Person from the typed text.
 * `onCreate` owns creating and selecting the new Person; if it throws, the
 * error is shown in the picker and the typed name is kept for another try.
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const selected = people.find((person) => person.id === value);
  const matches = filterPeople(people, query);
  const offerCreate = shouldOfferCreatePerson(people, query);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setCreateError(null);
    }
  }

  function handleSelect(personId: string) {
    onValueChange(personId);
    handleOpenChange(false);
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      await onCreate(query.trim());
      handleOpenChange(false);
    } catch (err) {
      setCreateError(getThrownMessage(err, "Kunde inte skapa person"));
    } finally {
      setCreating(false);
    }
  }

  return (
    // `modal` keeps the list scrollable when the combobox sits inside a Dialog.
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn("justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.name : "Person"}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Sök eller skapa person…"
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
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";

import { SearchCombobox, useCloseSearchCombobox } from "@/components/SearchCombobox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  ...triggerProps
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
  return (
    <SearchCombobox
      {...triggerProps}
      selectedLabel={people.find((person) => person.id === value)?.name}
      placeholder="Upphovsperson"
    >
      <PersonSearch people={people} value={value} onPick={onValueChange} onCreate={onCreate} />
    </SearchCombobox>
  );
}

/**
 * The search field and its results. Mounts when the picker opens, so the
 * typed text and any create error start fresh each time.
 */
function PersonSearch({
  people,
  value,
  onPick,
  onCreate,
}: {
  people: Person[];
  value: string;
  onPick: (personId: string) => void;
  /** Creates and selects the Person; the picker closes once it's done. */
  onCreate: (name: string) => Promise<void>;
}) {
  const close = useCloseSearchCombobox();
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
      close();
    } catch (err) {
      setCreateError(getThrownMessage(err, "Kunde inte skapa upphovsperson"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Sök eller skapa upphovsperson…"
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
            ? "Skriv ett namn för att lägga till en upphovsperson."
            : "Ingen upphovsperson hittades."}
        </CommandEmpty>
        {matches.length > 0 && (
          <CommandGroup>
            {matches.map((person) => (
              <CommandItem
                key={person.id}
                value={person.id}
                onSelect={() => {
                  onPick(person.id);
                  close();
                }}
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

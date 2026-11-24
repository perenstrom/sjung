"use client";

import { Check, Plus, Tag } from "lucide-react";
import { useState } from "react";

import { SearchCombobox } from "@/components/SearchCombobox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { creditRoleSuggestions, MAX_CREDIT_ROLE_LENGTH, shouldOfferNewCreditRole } from "@/lib/pieces/credit-roles";
import { normalizeSpacing } from "@/lib/text/match-key";
import { toggleCreditRole } from "@/lib/pieces/credits";
import { cn } from "@/lib/utils";

const NEW_ROLE_ITEM_VALUE = "__new-credit-role__";

/**
 * Picks several Credit roles, like a label picker: a search on top and a
 * checkbox list that ticks and unticks without closing. Typed text that
 * matches no role can be created as a new one. Roles the Person already
 * holds are shown ticked and can't be changed.
 */
export function CreditRolesPicker({
  roles,
  heldRoles,
  value,
  onValueChange,
  ...triggerProps
}: {
  /** The roles to list, ranked (see `rankCreditRoles`). */
  roles: string[];
  /** Roles the chosen Person already holds on the Piece. */
  heldRoles: ReadonlySet<string>;
  value: string[];
  onValueChange: (roles: string[]) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <SearchCombobox
      {...triggerProps}
      selectedLabel={value.join(", ")}
      placeholder="Roller"
      icon={<Tag className="size-4 shrink-0 opacity-60" aria-hidden="true" />}
    >
      <CreditRolesSearch roles={roles} heldRoles={heldRoles} value={value} onChange={onValueChange} />
    </SearchCombobox>
  );
}

/** Mounts when the picker opens, so the typed text starts empty each time. */
function CreditRolesSearch({
  roles,
  heldRoles,
  value,
  onChange,
}: {
  roles: string[];
  heldRoles: ReadonlySet<string>;
  value: string[];
  onChange: (roles: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  // Roles created here aren't among `roles` yet.
  const listed = [...roles, ...value.filter((role) => !roles.includes(role))];
  const matches = creditRoleSuggestions(listed, query);
  const offerNew = shouldOfferNewCreditRole(listed, query);
  const newRole = normalizeSpacing(query);

  function create() {
    onChange([...value, newRole]);
    setQuery("");
  }

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Sök eller skapa roll…"
        autoFocus
        value={query}
        maxLength={MAX_CREDIT_ROLE_LENGTH}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Ingen roll hittades.</CommandEmpty>
        {matches.length > 0 && (
          <CommandGroup>
            {matches.map((role) => {
              const held = heldRoles.has(role);
              const checked = held || value.includes(role);
              return (
                <CommandItem
                  key={role}
                  value={role}
                  disabled={held}
                  onSelect={() => onChange(toggleCreditRole(value, role))}
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-content-center rounded-[4px] border border-input",
                      checked && "border-primary bg-primary text-primary-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {checked ? <Check className="size-3 text-current" /> : null}
                  </span>
                  <span className="flex-1">
                    {role}
                    {checked ? <span className="sr-only">, vald</span> : null}
                  </span>
                  {held ? <span className="text-xs text-muted-foreground">Har redan</span> : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        {offerNew && (
          <CommandGroup>
            <CommandItem value={NEW_ROLE_ITEM_VALUE} onSelect={create}>
              <Plus className="size-4" aria-hidden="true" />
              Skapa roll &quot;{newRole}&quot;
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

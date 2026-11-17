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
import {
  creditRoleSuggestions,
  MAX_CREDIT_ROLE_LENGTH,
  normalizeCreditRole,
  shouldOfferNewCreditRole,
} from "@/lib/pieces/credit-roles";
import { cn } from "@/lib/utils";

const NEW_ROLE_ITEM_VALUE = "__new-credit-role__";

/**
 * Searchable Credit role picker: suggests `roles` (minus `heldRoles`) and can
 * use the typed text as a new role.
 */
export function CreditRoleCombobox({
  roles,
  heldRoles,
  value,
  onValueChange,
  ...triggerProps
}: {
  /** The roles to suggest, ranked (see `rankCreditRoles`). */
  roles: string[];
  /** Roles the chosen Person already holds on the Piece, left out of the suggestions. */
  heldRoles: ReadonlySet<string>;
  value: string;
  onValueChange: (role: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <SearchCombobox {...triggerProps} selectedLabel={value} placeholder="Roll">
      <CreditRoleSearch roles={roles} heldRoles={heldRoles} value={value} onPick={onValueChange} />
    </SearchCombobox>
  );
}

/** Mounts when the picker opens, so the typed text starts empty each time. */
function CreditRoleSearch({
  roles,
  heldRoles,
  value,
  onPick,
}: {
  roles: string[];
  heldRoles: ReadonlySet<string>;
  value: string;
  onPick: (role: string) => void;
}) {
  const close = useCloseSearchCombobox();
  const [query, setQuery] = useState("");

  function pick(role: string) {
    onPick(role);
    close();
  }

  const matches = creditRoleSuggestions(roles, heldRoles, query);
  const offerNew = shouldOfferNewCreditRole(roles, query);
  const newRole = normalizeCreditRole(query);

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Sök eller lägg till roll…"
        autoFocus
        value={query}
        maxLength={MAX_CREDIT_ROLE_LENGTH}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Ingen roll hittades.</CommandEmpty>
        {matches.length > 0 && (
          <CommandGroup>
            {matches.map((role) => (
              <CommandItem key={role} value={role} onSelect={() => pick(role)}>
                <Check
                  className={cn("size-4", role === value ? "opacity-100" : "opacity-0")}
                  aria-hidden="true"
                />
                {role}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {offerNew && (
          <CommandGroup>
            <CommandItem value={NEW_ROLE_ITEM_VALUE} onSelect={() => pick(newRole)}>
              <Plus className="size-4" aria-hidden="true" />
              Lägg till &quot;{newRole}&quot;
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

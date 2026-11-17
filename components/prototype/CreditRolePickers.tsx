"use client";

// PROTOTYPE (PER-431) — throwaway. Two shapes for picking several Credit
// roles at once, switched by `?variant=` (see PrototypeSwitcher).
// A: role dropdown with checkboxes. B: role chips with free text (PER-413).
// Never merge to main.

import { Check, ChevronsUpDown, Lock, Plus, Tag, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CreditRolePickerProps = {
  /** Credit roles to offer: the fixed set, or (B) the Group's earlier roles. */
  suggestions: string[];
  /** Credit roles the picked Person already holds on this Piece. */
  held: Set<string>;
  value: string[];
  onChange: (roles: string[]) => void;
  className?: string;
};

function toggle(roles: string[], role: string) {
  return roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
}

/** A: a select-like trigger whose list holds checkboxes and stays open. */
export function RoleCheckboxDropdown({
  suggestions,
  held,
  value,
  onChange,
  className,
}: CreditRolePickerProps) {
  const [open, setOpen] = useState(false);
  const summary = value.join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Roller"
          aria-expanded={open}
          className={cn("min-w-36 justify-between font-normal", className)}
        >
          <span className={cn("truncate", !summary && "text-muted-foreground")}>
            {summary || "Roller"}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <ul className="space-y-0.5">
          {suggestions.map((role) => {
            const isHeld = held.has(role);
            return (
              <li key={role}>
                <label
                  className={cn(
                    "flex min-h-9 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent",
                    isHeld && "cursor-not-allowed text-muted-foreground hover:bg-transparent"
                  )}
                >
                  <Checkbox
                    checked={isHeld || value.includes(role)}
                    disabled={isHeld}
                    onCheckedChange={() => onChange(toggle(value, role))}
                  />
                  <span className="flex-1">{role}</span>
                  {isHeld ? <span className="text-xs">Har redan</span> : null}
                </label>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/**
 * C: Linear's label picker. One compact trigger; the popover has the search
 * on top and a checkbox list that toggles without closing. Typed text that
 * matches no role offers "Skapa roll". Held roles are ticked and locked.
 */
export function RoleLabelPicker({
  suggestions,
  held,
  value,
  onChange,
  className,
}: CreditRolePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const typed = query.trim();
  const norm = (role: string) => role.toLocaleLowerCase("sv");
  // Roles created here aren't in `suggestions` yet; list them too.
  const all = [...new Set([...suggestions, ...value])];
  const matches = all.filter((role) => norm(role).includes(norm(typed)));
  const offerCreate = typed !== "" && !all.some((role) => norm(role) === norm(typed));

  function toggleRole(role: string) {
    onChange(toggle(value, role));
  }

  function create() {
    onChange([...value, typed]);
    setQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Roller"
          aria-expanded={open}
          className={cn("max-w-56 min-w-28 justify-start gap-1.5 font-normal", className)}
        >
          <Tag className="size-4 shrink-0 opacity-60" aria-hidden="true" />
          {value.length === 0 ? (
            <span className="text-muted-foreground">Roller</span>
          ) : (
            <span className="truncate">{value.join(", ")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Sök eller skapa roll…"
            autoFocus
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Inga roller.</CommandEmpty>
            {matches.length > 0 && (
              <CommandGroup>
                {matches.map((role) => {
                  const isHeld = held.has(role);
                  const checked = isHeld || value.includes(role);
                  return (
                    <CommandItem
                      key={role}
                      value={role}
                      disabled={isHeld}
                      onSelect={() => toggleRole(role)}
                    >
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-content-center rounded-[4px] border",
                          checked && "border-primary bg-primary text-primary-foreground",
                          isHeld && "opacity-50"
                        )}
                        aria-hidden="true"
                      >
                        {checked ? <Check className="size-3 text-current" /> : null}
                      </span>
                      <span className="flex-1">{role}</span>
                      {isHeld ? (
                        <span className="text-xs text-muted-foreground">Har redan</span>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {offerCreate && (
              <CommandGroup>
                <CommandItem value="__create-role__" onSelect={create}>
                  <Plus className="size-4" aria-hidden="true" />
                  Skapa roll &quot;{typed}&quot;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * B: picked roles as removable chips, plus a "+ Roll" combobox that suggests
 * the Group's earlier roles and can create a new one from the typed text.
 * Roles the Person already holds show as locked chips.
 */
export function RoleChipCombobox({
  suggestions,
  held,
  value,
  onChange,
  className,
}: CreditRolePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const typed = query.trim();
  const taken = new Set([...held, ...value].map((r) => r.toLocaleLowerCase("sv")));
  const matches = suggestions.filter(
    (role) =>
      !held.has(role) && role.toLocaleLowerCase("sv").includes(typed.toLocaleLowerCase("sv"))
  );
  const offerCreate =
    typed !== "" &&
    !taken.has(typed.toLocaleLowerCase("sv")) &&
    !suggestions.some((r) => r.toLocaleLowerCase("sv") === typed.toLocaleLowerCase("sv"));

  function pick(role: string) {
    onChange(toggle(value, role));
    setQuery("");
  }

  return (
    <div
      className={cn(
        "flex min-h-9 min-w-36 flex-wrap items-center gap-1 rounded-md border px-1.5 py-1",
        className
      )}
    >
      {[...held].map((role) => (
        <span
          key={`held-${role}`}
          className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
          title="Upphovspersonen har redan den här rollen"
        >
          <Lock className="size-3" aria-hidden="true" />
          {role}
        </span>
      ))}
      {value.map((role) => (
        <span
          key={role}
          className="inline-flex items-center gap-0.5 rounded-sm bg-secondary px-1.5 py-0.5 text-xs"
        >
          {role}
          <button
            type="button"
            className="rounded-sm opacity-60 hover:opacity-100"
            aria-label={`Ta bort ${role}`}
            onClick={() => onChange(value.filter((r) => r !== role))}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
        modal
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs font-normal text-muted-foreground"
            aria-label="Lägg till roll"
          >
            <Plus className="size-3" aria-hidden="true" />
            {value.length === 0 ? "Roller" : "Roll"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Sök eller skapa roll…"
              autoFocus
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>Skriv en roll.</CommandEmpty>
              {matches.length > 0 && (
                <CommandGroup heading="Använda i gruppen">
                  {matches.map((role) => (
                    <CommandItem key={role} value={role} onSelect={() => pick(role)}>
                      <Check
                        className={cn(
                          "size-4",
                          value.includes(role) ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                      {role}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {offerCreate && (
                <CommandGroup>
                  <CommandItem value="__create-role__" onSelect={() => pick(typed)}>
                    <Plus className="size-4" aria-hidden="true" />
                    Ny roll &quot;{typed}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

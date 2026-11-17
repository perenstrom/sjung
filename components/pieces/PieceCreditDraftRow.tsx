"use client";

import { Plus, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { createPerson } from "@/app/actions/people";
import { PersonCombobox } from "@/components/PersonCombobox";
import {
  RoleCheckboxDropdown,
  RoleChipCombobox,
  RoleLabelPicker,
} from "@/components/prototype/CreditRolePickers";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { mergePeople } from "@/lib/people/person-options";
import {
  type CreditDraft,
  type CreditForDisplay,
  creditRolesHeldBy,
  EMPTY_CREDIT_DRAFT,
  MISSING_CREDIT_FIELDS_ERROR,
} from "@/lib/pieces/credits";
import { ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { Person, PieceCredit } from "@/types/piece-credit-dialog";

/**
 * Person picker + Credit role select + "Lägg till" for one Credit. The picked
 * Person and Credit role (the draft) are owned by the caller, and so is
 * saving: `onAdd` gets the Credit, and if it throws, its message is shown in
 * the row. A Person created from the picker is saved right away, even if the
 * Credit is never added.
 */
export function PieceCreditDraftRow({
  groupSlug,
  people,
  credits,
  draft,
  onDraftChange,
  onAdd,
}: {
  groupSlug: string;
  people: Person[];
  /** The Credits so far, used to disable Credit roles the Person already holds. */
  credits: PieceCredit[];
  draft: CreditDraft;
  onDraftChange: (draft: CreditDraft) => void;
  /** PROTOTYPE (PER-431): one Credit per picked Credit role. */
  onAdd: (credits: CreditForDisplay[]) => Promise<void> | void;
}) {
  const variant = useSearchParams().get("variant") ?? "A";
  // PROTOTYPE: C stacks Person / roles / buttons on separate rows on mobile.
  const stackOnMobile = useIsMobile() && variant === "C";
  const personPickerRef = useRef<HTMLButtonElement>(null);
  const [createdPeople, setCreatedPeople] = useState<Person[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allPeople = mergePeople(people, createdPeople);
  const heldRoles = creditRolesHeldBy(credits, draft.personId);
  const hasDraft = draft.personId !== "" || draft.roles.length > 0;
  // PROTOTYPE: B fakes PER-413's "roles used before in the Group" with the
  // fixed set, the roles on this Piece, and one made-up custom role.
  const suggestions =
    variant === "B" || variant === "C"
      ?[...new Set([...ROLES, "Översättare", ...credits.map((c) => c.role)])]
      : [...ROLES];

  function selectPerson(personId: string) {
    // Don't leave Credit roles selected that the new Person already holds.
    const held = creditRolesHeldBy(credits, personId);
    onDraftChange({ personId, roles: draft.roles.filter((role) => !held.has(role)) });
  }

  async function handleCreatePerson(name: string) {
    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("name", name);
    const person = await createPerson(formData);
    setCreatedPeople((prev) => [...prev, person]);
    selectPerson(person.id);
  }

  function handleClear() {
    onDraftChange(EMPTY_CREDIT_DRAFT);
    setError(null);
    personPickerRef.current?.focus();
  }

  async function handleAdd() {
    const person = allPeople.find((candidate) => candidate.id === draft.personId);
    if (!person || draft.roles.length === 0) {
      setError(MISSING_CREDIT_FIELDS_ERROR);
      return;
    }

    setPending(true);
    try {
      await onAdd(
        draft.roles.map((role) => ({
          personId: person.id,
          role,
          person: { name: person.name },
        }))
      );
      setError(null);
      onDraftChange(EMPTY_CREDIT_DRAFT);
      personPickerRef.current?.focus();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte lägga till medverkande"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <PersonCombobox
          ref={personPickerRef}
          aria-label="Upphovsperson"
          people={allPeople}
          value={draft.personId}
          onValueChange={selectPerson}
          onCreate={handleCreatePerson}
          // PROTOTYPE: in C the Person takes a row of its own on mobile.
          className={cn("min-w-32 flex-1", variant === "C" && "max-md:basis-full")}
        />
        {variant === "C" ? (
          <RoleLabelPicker
            className="max-md:max-w-none max-md:basis-full"
            suggestions={suggestions}
            held={heldRoles}
            value={draft.roles}
            onChange={(roles) => onDraftChange({ ...draft, roles })}
          />
        ) : variant === "B" ? (
          <RoleChipCombobox
            suggestions={suggestions}
            held={heldRoles}
            value={draft.roles}
            onChange={(roles) => onDraftChange({ ...draft, roles })}
            className="flex-1"
          />
        ) : (
          <RoleCheckboxDropdown
            suggestions={suggestions}
            held={heldRoles}
            value={draft.roles}
            onChange={(roles) => onDraftChange({ ...draft, roles })}
          />
        )}
        {hasDraft ? (
          stackOnMobile ? (
            // PROTOTYPE: in C on mobile, clear is a full button beside "Lägg till".
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="flex-1"
            >
              <X className="size-4" aria-hidden="true" />
              Rensa
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              aria-label="Rensa medverkande"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          )
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={pending}
          className={cn(stackOnMobile && "flex-1")}
        >
          <Plus className="size-4" aria-hidden="true" />
          {pending ? "Lägger till…" : "Lägg till"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

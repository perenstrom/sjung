"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import { createPerson } from "@/app/actions/people";
import { PersonCombobox } from "@/components/PersonCombobox";
import { CreditRolesPicker } from "@/components/pieces/CreditRolesPicker";
import { Button } from "@/components/ui/button";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { mergePeople } from "@/lib/people/person-options";
import { rankCreditRoles } from "@/lib/pieces/credit-roles";
import {
  type CreditDraft,
  type CreditForDisplay,
  creditDraftError,
  creditRolesHeldBy,
  creditsFromDraft,
  EMPTY_CREDIT_DRAFT,
  MISSING_CREDIT_PERSON_ERROR,
  withCreditDraftPerson,
} from "@/lib/pieces/credits";
import type { Person, PieceCredit } from "@/types/piece-credit-dialog";

/**
 * Person picker + Credit roles picker + "Lägg till", for one Credit per
 * picked role. The picked Person and roles (the draft) are owned by the
 * caller, and so is saving: `onAdd` gets the Credits, and if it throws, its
 * message is shown in the row and the draft is kept. A Person created from
 * the picker is saved right away, even if the Credits are never added.
 *
 * Where the row is narrower than `@md`, it stacks: Person, roles, then
 * Rensa and Lägg till side by side.
 */
export function PieceCreditDraftRow({
  groupSlug,
  people,
  creditRoles,
  credits,
  draft,
  onDraftChange,
  onAdd,
}: {
  groupSlug: string;
  people: Person[];
  /** The Group's Credit roles to suggest (see `getCreditRoles`). */
  creditRoles: string[];
  /** The Credits so far: their roles are listed too, and those the Person holds are locked. */
  credits: PieceCredit[];
  draft: CreditDraft;
  onDraftChange: (draft: CreditDraft) => void;
  onAdd: (credits: CreditForDisplay[]) => Promise<void> | void;
}) {
  const personPickerRef = useRef<HTMLButtonElement>(null);
  const [createdPeople, setCreatedPeople] = useState<Person[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allPeople = mergePeople(people, createdPeople);
  const heldRoles = creditRolesHeldBy(credits, draft.personId);
  // Roles staged in an unsaved Piece aren't in the Group's roles yet.
  const suggestedRoles = rankCreditRoles([...creditRoles, ...credits.map((credit) => credit.role)]);
  const hasDraft = draft.personId !== "" || draft.roles.length > 0;

  function selectPerson(personId: string) {
    onDraftChange(withCreditDraftPerson(draft, credits, personId));
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
    const draftError = creditDraftError(draft) ?? (person ? null : MISSING_CREDIT_PERSON_ERROR);
    if (draftError || !person) {
      setError(draftError);
      return;
    }

    setPending(true);
    try {
      await onAdd(creditsFromDraft(draft).map((credit) => ({ ...credit, person: { name: person.name } })));
      setError(null);
      onDraftChange(EMPTY_CREDIT_DRAFT);
      personPickerRef.current?.focus();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte lägga till upphovspersonen"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="@container space-y-2">
      <div className="flex flex-wrap items-center gap-2 @md:flex-nowrap">
        <PersonCombobox
          ref={personPickerRef}
          aria-label="Upphovsperson"
          people={allPeople}
          value={draft.personId}
          onValueChange={selectPerson}
          onCreate={handleCreatePerson}
          className="basis-full @md:min-w-0 @md:flex-1 @md:basis-auto"
        />
        <CreditRolesPicker
          aria-label="Roller"
          roles={suggestedRoles}
          heldRoles={heldRoles}
          value={draft.roles}
          onValueChange={(roles) => onDraftChange({ ...draft, roles })}
          className="basis-full @md:w-40 @md:flex-none @md:basis-auto"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={!hasDraft}
          className="flex-1 @md:hidden"
        >
          <X className="size-4" aria-hidden="true" />
          Rensa
        </Button>
        {hasDraft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            aria-label="Rensa raden"
            className="hidden @md:inline-flex"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={handleAdd} disabled={pending} className="flex-1 @md:flex-none">
          <Plus className="size-4" aria-hidden="true" />
          {pending ? "Lägger till…" : "Lägg till"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

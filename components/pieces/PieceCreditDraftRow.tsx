"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import { createPerson } from "@/app/actions/people";
import { PersonCombobox } from "@/components/PersonCombobox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { mergePeople } from "@/lib/people/person-options";
import {
  type CreditDraft,
  type CreditForDisplay,
  creditRolesHeldBy,
  EMPTY_CREDIT_DRAFT,
} from "@/lib/pieces/credits";
import { ROLES } from "@/lib/roles";
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
  onAdd: (credit: CreditForDisplay) => Promise<void> | void;
}) {
  const personPickerRef = useRef<HTMLButtonElement>(null);
  const [createdPeople, setCreatedPeople] = useState<Person[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allPeople = mergePeople(people, createdPeople);
  const heldRoles = creditRolesHeldBy(credits, draft.personId);
  const hasDraft = draft.personId !== "" || draft.role !== "";

  function selectPerson(personId: string) {
    // Don't leave a Credit role selected that the new Person already holds.
    const role = creditRolesHeldBy(credits, personId).has(draft.role) ? "" : draft.role;
    onDraftChange({ personId, role });
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
    if (!person || !draft.role) {
      setError("Välj person och roll.");
      return;
    }

    setPending(true);
    try {
      await onAdd({ personId: person.id, role: draft.role, person: { name: person.name } });
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
          aria-label="Person"
          people={allPeople}
          value={draft.personId}
          onValueChange={selectPerson}
          onCreate={handleCreatePerson}
          className="min-w-32 flex-1"
        />
        <Select value={draft.role} onValueChange={(role) => onDraftChange({ ...draft, role })}>
          <SelectTrigger className="min-w-36" aria-label="Roll">
            <SelectValue placeholder="Roll" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((creditRole) => (
              <SelectItem
                key={creditRole}
                value={creditRole}
                disabled={heldRoles.has(creditRole)}
              >
                {creditRole}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasDraft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            aria-label="Rensa medverkande"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={handleAdd} disabled={pending}>
          <Plus className="size-4" aria-hidden="true" />
          {pending ? "Lägger till…" : "Lägg till"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

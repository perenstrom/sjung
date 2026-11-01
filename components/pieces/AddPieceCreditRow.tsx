"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createPerson } from "@/app/actions/people";
import { addCredit } from "@/app/actions/pieces";
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
import { creditRolesHeldBy } from "@/lib/pieces/credits";
import { ROLES } from "@/lib/roles";
import type { Person, PieceCredit } from "@/types/piece-credit-dialog";

/**
 * Always-visible row for adding one Credit to a Piece. A Person created from
 * the picker is saved right away, even if the Credit is never added.
 */
export function AddPieceCreditRow({
  groupSlug,
  pieceId,
  people,
  credits,
}: {
  groupSlug: string;
  pieceId: string;
  people: Person[];
  /** The Piece's current Credits, used to disable roles the Person already holds. */
  credits: PieceCredit[];
}) {
  const router = useRouter();
  const personPickerRef = useRef<HTMLButtonElement>(null);
  const [personId, setPersonId] = useState("");
  const [role, setRole] = useState("");
  const [createdPeople, setCreatedPeople] = useState<Person[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allPeople = mergePeople(people, createdPeople);
  const heldRoles = creditRolesHeldBy(credits, personId);

  function selectPerson(nextPersonId: string) {
    setPersonId(nextPersonId);
    // Don't leave a Credit role selected that the new Person already holds.
    if (creditRolesHeldBy(credits, nextPersonId).has(role)) {
      setRole("");
    }
  }

  async function handleCreatePerson(name: string) {
    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("name", name);
    const person = await createPerson(formData);
    setCreatedPeople((prev) => [...prev, person]);
    selectPerson(person.id);
  }

  async function handleAdd() {
    if (!personId || !role) {
      setError("Välj person och roll.");
      return;
    }

    setPending(true);
    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("pieceId", pieceId);
      formData.set("personId", personId);
      formData.set("role", role);
      await addCredit(formData);
      setError(null);
      setPersonId("");
      setRole("");
      personPickerRef.current?.focus();
      router.refresh();
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
          value={personId}
          onValueChange={selectPerson}
          onCreate={handleCreatePerson}
          className="min-w-40 flex-1"
        />
        <Select value={role} onValueChange={setRole}>
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
        <Button type="button" variant="outline" onClick={handleAdd} disabled={pending}>
          <Plus className="size-4" aria-hidden="true" />
          {pending ? "Lägger till…" : "Lägg till"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findSameNamedPerson } from "@/lib/people/same-name";

/**
 * The `name` field for adding or renaming a Person. Hints when another Person
 * in the Group already has the name, but never blocks saving: two People may
 * share a name (CONTEXT.md).
 */
export function PersonNameField({
  people,
  exceptId,
  defaultValue = "",
}: {
  /** The Group's People, to compare the typed name against. */
  people: readonly { id: string; name: string }[];
  /** The Person being renamed, who never counts as a match for themself. */
  exceptId?: string;
  defaultValue?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [name, setName] = useState(defaultValue);
  const sameNamed = findSameNamedPerson(name, people, exceptId);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Namn</Label>
      <Input
        id={id}
        name="name"
        required
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-describedby={sameNamed ? hintId : undefined}
      />
      <p id={hintId} aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
        {sameNamed ? `Det finns redan en upphovsperson som heter ${sameNamed.name}` : null}
      </p>
    </div>
  );
}

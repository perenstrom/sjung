"use client";

import { renamePerson } from "@/app/actions/people";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import { PersonNameField } from "@/components/people/PersonNameField";
import { Button } from "@/components/ui/button";

/** Renames a Person; the new name shows at once on every Piece crediting them. */
export function RenamePersonDialog({
  groupSlug,
  person,
  people,
}: {
  groupSlug: string;
  person: { id: string; name: string };
  /** The Group's People, for the same-name hint. */
  people: readonly { id: string; name: string }[];
}) {
  return (
    <EntityFormDialog.Root fallbackSv="Kunde inte byta namn på upphovsperson">
      <EntityFormDialog.Trigger asChild>
        <Button variant="outline" size="sm">
          Byt namn
        </Button>
      </EntityFormDialog.Trigger>
      <EntityFormDialog.Content>
        <EntityFormDialog.Header>
          <EntityFormDialog.Title>Byt namn på upphovsperson</EntityFormDialog.Title>
        </EntityFormDialog.Header>
        <EntityFormDialog.Form
          action={async (formData) => {
            await renamePerson(formData);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="personId" value={person.id} />
          <PersonNameField people={people} exceptId={person.id} defaultValue={person.name} />
          <EntityFormDialog.Error />
          <EntityFormDialog.Footer>
            <Button type="submit">Spara</Button>
          </EntityFormDialog.Footer>
        </EntityFormDialog.Form>
      </EntityFormDialog.Content>
    </EntityFormDialog.Root>
  );
}

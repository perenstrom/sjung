"use client";

import { createPerson } from "@/app/actions/people";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import { PersonNameField } from "@/components/people/PersonNameField";
import { Button } from "@/components/ui/button";

export function CreatePersonDialog({
  groupSlug,
  people,
}: {
  groupSlug: string;
  /** The Group's People, for the same-name hint. */
  people: readonly { id: string; name: string }[];
}) {
  return (
    <EntityFormDialog.Root fallbackSv="Kunde inte lägga till upphovsperson">
      <EntityFormDialog.Trigger asChild>
        <Button>Lägg till</Button>
      </EntityFormDialog.Trigger>
      <EntityFormDialog.Content>
        <EntityFormDialog.Header>
          <EntityFormDialog.Title>Lägg till upphovsperson</EntityFormDialog.Title>
        </EntityFormDialog.Header>
        <EntityFormDialog.Form
          action={async (formData) => {
            await createPerson(formData);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <PersonNameField people={people} />
          <EntityFormDialog.Error />
          <EntityFormDialog.Footer>
            <Button type="submit">Spara</Button>
          </EntityFormDialog.Footer>
        </EntityFormDialog.Form>
      </EntityFormDialog.Content>
    </EntityFormDialog.Root>
  );
}

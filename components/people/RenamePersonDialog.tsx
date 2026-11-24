"use client";

import { useRouter } from "next/navigation";

import { renamePerson } from "@/app/actions/people";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import { PersonNameField } from "@/components/people/PersonNameField";
import { Button } from "@/components/ui/button";
import { groupPersonPath } from "@/lib/groups/routes";

/**
 * Renames a Person on their page; the new name shows at once on every Piece
 * crediting them. The page moves with the Person's Slug (ADR-0011).
 */
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
  const router = useRouter();
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
            router.replace(groupPersonPath(groupSlug, await renamePerson(formData)));
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

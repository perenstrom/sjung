"use client";

import { createPerson } from "@/app/actions/people";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreatePersonDialog({ groupSlug }: { groupSlug: string }) {
  return (
    <EntityFormDialog.Root fallbackSv="Kunde inte lägga till person">
      <EntityFormDialog.Trigger asChild>
        <Button>Lägg till</Button>
      </EntityFormDialog.Trigger>
      <EntityFormDialog.Content>
        <EntityFormDialog.Header>
          <EntityFormDialog.Title>Lägg till person</EntityFormDialog.Title>
        </EntityFormDialog.Header>
        <EntityFormDialog.Form
          action={async (formData) => {
            await createPerson(formData);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <div className="space-y-2">
            <Label htmlFor="name">Namn</Label>
            <Input id="name" name="name" required autoFocus />
          </div>
          <EntityFormDialog.Error />
          <div className="flex justify-end">
            <Button type="submit">Spara</Button>
          </div>
        </EntityFormDialog.Form>
      </EntityFormDialog.Content>
    </EntityFormDialog.Root>
  );
}

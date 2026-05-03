"use client";

import { createGroup } from "@/app/actions/groups";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateGroupDialog() {
  return (
    <EntityFormDialog.Root fallbackSv="Kunde inte skapa grupp">
      <EntityFormDialog.Trigger asChild>
        <Button>Lägg till</Button>
      </EntityFormDialog.Trigger>
      <EntityFormDialog.Content>
        <EntityFormDialog.Header>
          <EntityFormDialog.Title>Lägg till grupp</EntityFormDialog.Title>
        </EntityFormDialog.Header>
        <EntityFormDialog.Form
          action={async (formData) => {
            await createGroup(formData);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="group-name">Gruppnamn</Label>
            <Input id="group-name" name="name" required autoFocus />
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

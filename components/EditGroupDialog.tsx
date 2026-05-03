"use client";

import { updateGroup } from "@/app/actions/groups";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GroupRow = {
  id: string;
  name: string;
};

export function EditGroupDialog({ group }: { group: GroupRow }) {
  return (
    <EntityFormDialog.Root fallbackSv="Kunde inte spara gruppen">
      <EntityFormDialog.Trigger asChild>
        <Button variant="outline" size="sm">
          Redigera
        </Button>
      </EntityFormDialog.Trigger>
      <EntityFormDialog.Content>
        <EntityFormDialog.Header>
          <EntityFormDialog.Title>Redigera grupp</EntityFormDialog.Title>
        </EntityFormDialog.Header>
        <EntityFormDialog.Form
          key={group.id}
          action={async (formData) => {
            await updateGroup(formData);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={group.id} />
          <div className="space-y-2">
            <Label htmlFor={`edit-group-name-${group.id}`}>Gruppnamn</Label>
            <Input
              id={`edit-group-name-${group.id}`}
              name="name"
              required
              autoFocus
              defaultValue={group.name}
            />
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

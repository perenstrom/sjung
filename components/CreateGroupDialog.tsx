"use client";

import { createGroup } from "@/app/actions/groups";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CREATE_GROUP_LABEL = "Skapa ny grupp";

/** A "Skapa ny grupp" button that opens a dialog for naming and creating a Group. */
export function CreateGroupDialog({
  triggerVariant = "default",
}: {
  triggerVariant?: "default" | "outline";
}) {
  return (
    <EntityFormDialog.Root fallbackSv="Kunde inte skapa grupp">
      <EntityFormDialog.Trigger asChild>
        <Button variant={triggerVariant}>{CREATE_GROUP_LABEL}</Button>
      </EntityFormDialog.Trigger>
      <EntityFormDialog.Content>
        <EntityFormDialog.Header>
          <EntityFormDialog.Title>{CREATE_GROUP_LABEL}</EntityFormDialog.Title>
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
          <EntityFormDialog.Footer>
            <Button type="submit">Skapa</Button>
          </EntityFormDialog.Footer>
        </EntityFormDialog.Form>
      </EntityFormDialog.Content>
    </EntityFormDialog.Root>
  );
}

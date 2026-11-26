"use client";

import { useState } from "react";

import { createGroup } from "@/app/actions/groups";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A small "Vill du starta en egen grupp?" link that opens a dialog explaining
 * what a Group is, then naming and creating one once the user confirms they
 * become its Creator.
 */
export function CreateGroupDialog() {
  return (
    <EntityFormDialog.Root fallbackSv="Kunde inte skapa grupp">
      <EntityFormDialog.Trigger asChild>
        <Button variant="link" className="h-auto p-0 text-muted-foreground">
          Vill du starta en egen grupp?
        </Button>
      </EntityFormDialog.Trigger>
      <EntityFormDialog.Content>
        <EntityFormDialog.Header>
          <EntityFormDialog.Title>Skapa ny grupp</EntityFormDialog.Title>
        </EntityFormDialog.Header>
        <CreateGroupForm />
      </EntityFormDialog.Content>
    </EntityFormDialog.Root>
  );
}

/** Mounted only while the dialog is open, so the confirmation starts unticked every time. */
function CreateGroupForm() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <EntityFormDialog.Form
      action={async (formData) => {
        await createGroup(formData);
      }}
      className="space-y-4"
    >
      <div className="space-y-2 text-sm">
        <p>En grupp är en egen plats för en kör eller ensemble, med egna stycken, repertoarer och medlemmar.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Du blir gruppens administratör och ansvarar för den.</li>
          <li>Andra kan bara gå med om du (eller någon du gett behörighet) bjuder in dem.</li>
          <li>
            <strong>Vill du gå med i en grupp som redan finns?</strong> Skapa ingen ny. Be någon i gruppen bjuda in dig
            och följ länken i mejlet.
          </li>
        </ul>
      </div>
      <div className="space-y-2">
        <Label htmlFor="group-name">Gruppnamn</Label>
        <Input id="group-name" name="name" required autoFocus />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id="group-confirmed"
          name="confirmed"
          checked={confirmed}
          onCheckedChange={(checked) => setConfirmed(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="group-confirmed" className="leading-snug font-normal">
          Jag förstår att jag skapar en ny grupp och blir dess administratör.
        </Label>
      </div>
      <EntityFormDialog.Error />
      <EntityFormDialog.Footer>
        <Button type="submit" disabled={!confirmed}>
          Skapa
        </Button>
      </EntityFormDialog.Footer>
    </EntityFormDialog.Form>
  );
}

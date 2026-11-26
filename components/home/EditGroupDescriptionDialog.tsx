"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { setGroupDescription } from "@/app/actions/groups";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import { GROUP_DESCRIPTION_PROSE } from "@/components/home/group-description-prose";
import { MarkdownField } from "@/components/markdown/MarkdownField";
import { Button } from "@/components/ui/button";
import { GROUP_DESCRIPTION_MAX_LENGTH } from "@/lib/schemas/groups";

/**
 * _Redigera beskrivning_: writes, changes or clears the Group description.
 * Saving blank text clears it; the last save wins. Each opening starts from
 * the saved description, and what was typed survives a rejected save.
 */
export function EditGroupDescriptionDialog({
  groupSlug,
  description,
}: {
  groupSlug: string;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);
  const saved = description ?? "";
  const [draft, setDraft] = useState(saved);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(saved);
    }
    setOpen(nextOpen);
  }

  return (
    <EntityFormDialog.Root fallbackSv="Kunde inte spara beskrivningen" open={open} onOpenChange={handleOpenChange}>
      <EntityFormDialog.Trigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          Redigera beskrivning
        </Button>
      </EntityFormDialog.Trigger>
      <EntityFormDialog.Content className="sm:max-w-2xl">
        <EntityFormDialog.Header>
          <EntityFormDialog.Title>Redigera beskrivning</EntityFormDialog.Title>
        </EntityFormDialog.Header>
        <EntityFormDialog.Form action={setGroupDescription} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <MarkdownField
            id="group-description"
            name="description"
            label="Beskrivning"
            value={draft}
            onChange={setDraft}
            maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
            className="min-h-48"
            previewClassName={GROUP_DESCRIPTION_PROSE}
          />
          <EntityFormDialog.Error />
          <EntityFormDialog.Footer>
            <Button type="submit">Spara</Button>
          </EntityFormDialog.Footer>
        </EntityFormDialog.Form>
      </EntityFormDialog.Content>
    </EntityFormDialog.Root>
  );
}

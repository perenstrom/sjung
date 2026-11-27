"use client";

import { Pencil, Plus } from "lucide-react";

import { addGroupLink, updateGroupLink } from "@/app/actions/group-links";
import type { GroupLink } from "@/app/actions/groups";
import { EntityFormDialog } from "@/components/EntityFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GROUP_LINK_LABEL_MAX_LENGTH, GROUP_LINK_URL_MAX_LENGTH } from "@/lib/schemas/group-links";

/**
 * _Lägg till länk_, or with a `link`, _Redigera_ on it: a Group link's
 * _Namn_ and _Adress_. An address typed without `https://` gets it on save.
 */
export function GroupLinkDialog({ groupSlug, link }: { groupSlug: string; link?: GroupLink }) {
  const idPrefix = `group-link-${link?.id ?? "new"}`;

  return (
    <EntityFormDialog.Root fallbackSv="Kunde inte spara länken">
      <EntityFormDialog.Trigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={link ? `Redigera ${link.label}` : undefined}>
          {link ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {link ? "Redigera" : "Lägg till länk"}
        </Button>
      </EntityFormDialog.Trigger>
      <EntityFormDialog.Content>
        <EntityFormDialog.Header>
          <EntityFormDialog.Title>{link ? "Redigera länk" : "Lägg till länk"}</EntityFormDialog.Title>
        </EntityFormDialog.Header>
        <EntityFormDialog.Form action={link ? updateGroupLink : addGroupLink} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          {link ? <input type="hidden" name="linkId" value={link.id} /> : null}
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-label`}>Namn</Label>
            <Input
              id={`${idPrefix}-label`}
              name="label"
              required
              autoFocus
              maxLength={GROUP_LINK_LABEL_MAX_LENGTH}
              defaultValue={link?.label}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-url`}>Adress</Label>
            <Input
              id={`${idPrefix}-url`}
              name="url"
              required
              inputMode="url"
              autoComplete="url"
              placeholder="https://"
              maxLength={GROUP_LINK_URL_MAX_LENGTH}
              defaultValue={link?.url}
            />
          </div>
          <EntityFormDialog.Error />
          <EntityFormDialog.Footer>
            <Button type="submit">Spara</Button>
          </EntityFormDialog.Footer>
        </EntityFormDialog.Form>
      </EntityFormDialog.Content>
    </EntityFormDialog.Root>
  );
}

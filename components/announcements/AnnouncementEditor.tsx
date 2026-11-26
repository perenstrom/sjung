"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createAnnouncement, updateAnnouncement, type AnnouncementFormState } from "@/app/actions/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownField } from "@/components/markdown/MarkdownField";
import { MANAGE_ANNOUNCEMENTS_PATH } from "@/lib/announcements/routes";
import { ANNOUNCEMENT_BODY_MAX_LENGTH, ANNOUNCEMENT_TITLE_MAX_LENGTH } from "@/lib/schemas/announcements";

type AnnouncementEditorProps = {
  /** The Announcement being edited; without it, saving publishes a new one. */
  announcement?: { id: string; title: string; body: string };
};

/**
 * Writes an Announcement's title and Markdown body, with a preview rendered
 * exactly as readers will see it. Saving a new one publishes it at once.
 */
export function AnnouncementEditor({ announcement }: AnnouncementEditorProps) {
  const [state, formAction, isPending] = useActionState<AnnouncementFormState, FormData>(
    announcement ? updateAnnouncement : createAnnouncement,
    null,
  );
  // Controlled, so what was typed survives a rejected save and the preview.
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {announcement ? <input type="hidden" name="id" value={announcement.id} /> : null}

      {state?.error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="announcement-title">Rubrik</Label>
        <Input
          id="announcement-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={ANNOUNCEMENT_TITLE_MAX_LENGTH}
          required
        />
      </div>

      <MarkdownField
        id="announcement-body"
        name="body"
        label="Text"
        value={body}
        onChange={setBody}
        maxLength={ANNOUNCEMENT_BODY_MAX_LENGTH}
        required
        className="min-h-80"
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending}>
          {announcement ? "Spara" : "Publicera"}
        </Button>
        <Button asChild variant="outline">
          <Link href={MANAGE_ANNOUNCEMENTS_PATH}>Avbryt</Link>
        </Button>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createAnnouncement,
  updateAnnouncement,
  type AnnouncementFormState,
} from "@/app/actions/announcements";
import { AnnouncementBody } from "@/components/announcements/AnnouncementBody";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MANAGE_ANNOUNCEMENTS_PATH } from "@/lib/announcements/routes";
import { ANNOUNCEMENT_BODY_MAX_LENGTH, ANNOUNCEMENT_TITLE_MAX_LENGTH } from "@/lib/schemas/announcements";
import { cn } from "@/lib/utils";

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
    null
  );
  // Controlled, so what was typed survives a rejected save and the preview.
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [mode, setMode] = useState<"write" | "preview">("write");

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

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor="announcement-body">Text</Label>
          <div role="group" aria-label="Visa" className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={mode === "write" ? "secondary" : "ghost"}
              aria-pressed={mode === "write"}
              onClick={() => setMode("write")}
            >
              Skriv
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "preview" ? "secondary" : "ghost"}
              aria-pressed={mode === "preview"}
              onClick={() => setMode("preview")}
            >
              Förhandsgranska
            </Button>
          </div>
        </div>
        {/* Hidden rather than unmounted in preview, so it is still submitted. */}
        <Textarea
          id="announcement-body"
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={ANNOUNCEMENT_BODY_MAX_LENGTH}
          required
          className={cn("min-h-80 font-mono", mode === "preview" && "hidden")}
        />
        {mode === "preview" ? (
          <div className="min-h-80 rounded-md border px-4 py-3">
            {body.trim() ? (
              <AnnouncementBody body={body} />
            ) : (
              <p className="text-muted-foreground text-sm">Inget att förhandsgranska än.</p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Markdown: rubriker, fetstil, listor, länkar och tabeller. HTML och bilder visas inte.
          </p>
        )}
      </div>

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

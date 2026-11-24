import { z } from "zod";
import { formDataString } from "@/lib/schemas/form-data";

export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 200;
export const ANNOUNCEMENT_BODY_MAX_LENGTH = 20_000;

const announcementSchema = z.object({
  title: z
    .string()
    .min(1, { error: "Skriv en rubrik" })
    .max(ANNOUNCEMENT_TITLE_MAX_LENGTH, { error: "Rubriken får vara högst 200 tecken" }),
  body: z
    .string()
    .min(1, { error: "Skriv en text" })
    .max(ANNOUNCEMENT_BODY_MAX_LENGTH, { error: "Texten får vara högst 20 000 tecken" }),
});

/** What the Announcement editor submits: a title and a Markdown body, both trimmed. */
export type AnnouncementForm = z.infer<typeof announcementSchema>;

export type ParseAnnouncementFormResult =
  { success: true; data: AnnouncementForm } | { success: false; error: string; values: AnnouncementForm };

export function parseAnnouncementForm(formData: FormData): ParseAnnouncementFormResult {
  const values = {
    title: formDataString(formData, "title").trim(),
    body: formDataString(formData, "body").trim(),
  };
  const parsed = announcementSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ogiltig nyhet", values };
  }
  return { success: true, data: parsed.data };
}

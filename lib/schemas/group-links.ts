import { z } from "zod";

import { formDataString } from "@/lib/schemas/form-data";

export const GROUP_LINK_LABEL_MAX_LENGTH = 100;
export const GROUP_LINK_URL_MAX_LENGTH = 2_000;

/** A scheme such as `https:` or `mailto:`, but not a host followed by its port (`localhost:3000`). */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

const groupLinkLabelSchema = z
  .string()
  .trim()
  .min(1, { error: "Namn krävs" })
  .max(GROUP_LINK_LABEL_MAX_LENGTH, { error: "Namnet får vara högst 100 tecken" });

/** The address as saved: `https://` added when no scheme was typed, and only http(s) accepted. */
const groupLinkUrlSchema = z
  .string()
  .trim()
  .min(1, { error: "Adress krävs" })
  .transform((address) => (HAS_SCHEME.test(address) ? address : `https://${address}`))
  .pipe(
    z
      .string()
      .max(GROUP_LINK_URL_MAX_LENGTH, { error: "Adressen får vara högst 2 000 tecken" })
      .superRefine((address, ctx) => {
        let url: URL;
        try {
          url = new URL(address);
        } catch {
          ctx.addIssue({ code: "custom", message: "Ogiltig adress" });
          return;
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          ctx.addIssue({ code: "custom", message: "Adressen måste börja med http eller https" });
        }
      }),
  );

const groupLinkSchema = z.object({ label: groupLinkLabelSchema, url: groupLinkUrlSchema });

export type GroupLinkInput = z.infer<typeof groupLinkSchema>;

/** Reads the `label` and `url` fields of the Group link dialog. */
export function parseGroupLinkFromFormData(formData: FormData): GroupLinkInput {
  const result = groupLinkSchema.safeParse({
    label: formDataString(formData, "label"),
    url: formDataString(formData, "url"),
  });
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ogiltig länk");
  }
  return result.data;
}

const groupLinkIdSchema = z.string().trim().min(1, { error: "Länk saknas" });

/** Reads the `linkId` field: which Group link to change or remove. */
export function parseGroupLinkIdFromFormData(formData: FormData): string {
  const result = groupLinkIdSchema.safeParse(formDataString(formData, "linkId"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Länk saknas");
  }
  return result.data;
}

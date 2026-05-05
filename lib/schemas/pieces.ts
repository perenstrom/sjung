import { z } from "zod";

import { ROLES } from "@/lib/roles";
import type { PieceCredit } from "@/lib/pieces/credits";
import { personNameSchema, writableGroupSlugSchema } from "@/lib/schemas/people";

const INVALID_CREDITS_ERROR = "Ogiltigt format för medverkande";

function formDataString(formData: FormData, field: string): string {
  const raw = formData.get(field);
  return typeof raw === "string" ? raw : "";
}

export function parsePieceGroupSlugFromFormData(formData: FormData): string {
  const result = writableGroupSlugSchema.safeParse(
    formDataString(formData, "groupSlug")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Saknar grupp");
  }
  return result.data;
}

export function parsePieceNameFromFormData(formData: FormData): string {
  const result = personNameSchema.safeParse(formDataString(formData, "name"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Namn krävs");
  }
  return result.data;
}

const pieceIdFieldSchema = z
  .string()
  .trim()
  .min(1, { error: "Stycke saknas" });

export function parsePieceIdParam(pieceId: string): string {
  const result = pieceIdFieldSchema.safeParse(pieceId);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Stycke saknas");
  }
  return result.data;
}

const pieceNoteIdFieldSchema = z
  .string()
  .trim()
  .min(1, { error: "Anteckning saknas" });

const pieceNoteContentSchema = z
  .string()
  .trim()
  .min(1, { error: "Anteckning krävs" })
  .max(50_000, { error: "Anteckningen är för lång" });

const linkIdFieldSchema = z
  .string()
  .trim()
  .min(1, { error: "Länk saknas" });

export function parsePieceIdFromFormData(formData: FormData): string {
  const result = pieceIdFieldSchema.safeParse(
    formDataString(formData, "pieceId")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Stycke saknas");
  }
  return result.data;
}

export function parseLinkIdFromFormData(formData: FormData): string {
  const result = linkIdFieldSchema.safeParse(
    formDataString(formData, "linkId")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Länk saknas");
  }
  return result.data;
}

export function parsePieceNoteIdFromFormData(formData: FormData): string {
  const result = pieceNoteIdFieldSchema.safeParse(
    formDataString(formData, "pieceNoteId")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Anteckning saknas");
  }
  return result.data;
}

export function parsePieceNoteContentFromFormData(formData: FormData): string {
  const result = pieceNoteContentSchema.safeParse(
    formDataString(formData, "content")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Anteckning krävs");
  }
  return result.data;
}

const optionalLabelSchema = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s === "" ? null : s));

export function parseOptionalLinkLabelFromFormData(
  formData: FormData
): string | null {
  const result = optionalLabelSchema.safeParse(formDataString(formData, "label"));
  if (!result.success) {
    return null;
  }
  return result.data;
}

const httpUrlSchema = z
  .string()
  .trim()
  .min(1, { error: "Länk krävs" })
  .superRefine((val, ctx) => {
    try {
      const u = new URL(val);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        ctx.addIssue({
          code: "custom",
          message: "Länk måste börja med http eller https",
        });
      }
    } catch {
      ctx.addIssue({ code: "custom", message: "Ogiltig länk" });
    }
  })
  .transform((val) => new URL(val.trim()));

export function parseRequiredHttpUrlFromFormData(formData: FormData): URL {
  const result = httpUrlSchema.safeParse(formDataString(formData, "url"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Länk krävs");
  }
  return result.data;
}

const pieceCreditItemSchema = z.object({
  personId: z.uuid(),
  role: z.enum(ROLES),
});

export function parsePieceCreditsFromFormData(formData: FormData): PieceCredit[] {
  const creditsJson = formData.get("credits");
  if (!creditsJson) {
    return [];
  }
  if (typeof creditsJson !== "string") {
    throw new Error(INVALID_CREDITS_ERROR);
  }
  if (creditsJson.trim() === "") {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(creditsJson);
  } catch {
    throw new Error(INVALID_CREDITS_ERROR);
  }

  const arrayResult = z.array(pieceCreditItemSchema).safeParse(parsed);
  if (!arrayResult.success) {
    throw new Error(INVALID_CREDITS_ERROR);
  }

  return arrayResult.data;
}

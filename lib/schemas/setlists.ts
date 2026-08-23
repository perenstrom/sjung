import { z } from "zod";

function formDataString(formData: FormData, field: string): string {
  const raw = formData.get(field);
  return typeof raw === "string" ? raw : "";
}

const setListNameSchema = z.string().trim().min(1, { error: "Namn krävs" });

const setListIdSchema = z.string().trim().min(1, { error: "Repertoar saknas" });

const setListPieceIdSchema = z
  .string()
  .trim()
  .min(1, { error: "Repertoarpost saknas" });

const setListPieceNoteIdSchema = z
  .string()
  .trim()
  .min(1, { error: "Anteckning saknas" });

const setListNoteIdSchema = z.string().trim().min(1, { error: "Anteckning saknas" });

const setListNoteContentSchema = z
  .string()
  .trim()
  .min(1, { error: "Anteckning krävs" })
  .max(50_000, { error: "Anteckningen är för lång" });

export function parseSetListNameFromFormData(formData: FormData): string {
  const result = setListNameSchema.safeParse(formDataString(formData, "name"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Namn krävs");
  }
  return result.data;
}

export function parseSetListIdFromFormData(formData: FormData): string {
  const result = setListIdSchema.safeParse(formDataString(formData, "setListId"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Repertoar saknas");
  }
  return result.data;
}

export function parseSetListPieceIdFromFormData(formData: FormData): string {
  const result = setListPieceIdSchema.safeParse(
    formDataString(formData, "setListPieceId")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Repertoarpost saknas");
  }
  return result.data;
}

export function parseSetListPieceNoteIdFromFormData(formData: FormData): string {
  const result = setListPieceNoteIdSchema.safeParse(
    formDataString(formData, "setListPieceNoteId")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Anteckning saknas");
  }
  return result.data;
}

export function parseSetListNoteIdFromFormData(formData: FormData): string {
  const result = setListNoteIdSchema.safeParse(
    formDataString(formData, "setListNoteId")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Anteckning saknas");
  }
  return result.data;
}

export function parseSetListPieceNoteContentFromFormData(formData: FormData): string {
  const result = setListNoteContentSchema.safeParse(formDataString(formData, "content"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Anteckning krävs");
  }
  return result.data;
}

export function parseSetListNoteContentFromFormData(formData: FormData): string {
  const result = setListNoteContentSchema.safeParse(formDataString(formData, "content"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Anteckning krävs");
  }
  return result.data;
}

export function parseOptionalSetListDateFromFormData(formData: FormData): Date | null {
  const raw = formDataString(formData, "date").trim();
  if (raw === "") {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Ogiltigt datum");
  }
  return parsed;
}

export function parseOrderedSetListStepIdsFromFormData(formData: FormData): string[] {
  const raw = formDataString(formData, "orderedSetListStepIds").trim();
  if (raw === "") {
    throw new Error("Ny ordning saknas");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Ogiltig ordning");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Ogiltig ordning");
  }

  const ids = parsed
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  if (ids.length === 0) {
    throw new Error("Ogiltig ordning");
  }

  return ids;
}

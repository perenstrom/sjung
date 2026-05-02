import { z } from "zod";

export const groupNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Gruppnamn krävs" });

export const groupIdSchema = z.uuid({ error: "Ogiltig grupp" });

function formDataString(formData: FormData, field: string): string {
  const raw = formData.get(field);
  return typeof raw === "string" ? raw : "";
}

export function parseGroupNameFromFormData(formData: FormData): string {
  const result = groupNameSchema.safeParse(formDataString(formData, "name"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Gruppnamn krävs");
  }
  return result.data;
}

export function parseGroupIdFromFormData(
  formData: FormData,
  field = "id"
): string {
  const result = groupIdSchema.safeParse(formDataString(formData, field));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ogiltig grupp");
  }
  return result.data;
}

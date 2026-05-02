import { z } from "zod";

export const personNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Namn krävs" });

export const writableGroupSlugSchema = z
  .string()
  .trim()
  .min(1, { error: "Saknar grupp" });

function formDataString(formData: FormData, field: string): string {
  const raw = formData.get(field);
  return typeof raw === "string" ? raw : "";
}

export function parsePersonNameFromFormData(formData: FormData): string {
  const result = personNameSchema.safeParse(formDataString(formData, "name"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Namn krävs");
  }
  return result.data;
}

export function parseWritableGroupSlugFromFormData(formData: FormData): string {
  const result = writableGroupSlugSchema.safeParse(
    formDataString(formData, "groupSlug")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Saknar grupp");
  }
  return result.data;
}

export function parseWritableGroupSlugParam(groupSlug: string): string {
  const result = writableGroupSlugSchema.safeParse(groupSlug);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Saknar grupp");
  }
  return result.data;
}

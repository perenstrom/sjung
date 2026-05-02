import { z } from "zod";

export const groupNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Gruppnamn krävs" });

export const groupIdSchema = z.uuid({ error: "Ogiltig grupp" });

export const membershipGroupSlugSchema = z
  .string()
  .trim()
  .min(1, { error: "Ogiltig grupp" });

export const inviteEmailSchema = z
  .string()
  .trim()
  .min(1, { error: "E-post krävs" })
  .transform((s) => s.toLowerCase());

export const memberUserIdSchema = z
  .string()
  .trim()
  .min(1, { error: "Ogiltig medlem" });

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

export function parseMembershipGroupSlugFromFormData(
  formData: FormData
): string {
  const result = membershipGroupSlugSchema.safeParse(
    formDataString(formData, "groupSlug")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ogiltig grupp");
  }
  return result.data;
}

export function parseInviteEmailFromFormData(formData: FormData): string {
  const result = inviteEmailSchema.safeParse(formDataString(formData, "email"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "E-post krävs");
  }
  return result.data;
}

export function parseMemberUserIdFromFormData(formData: FormData): string {
  const result = memberUserIdSchema.safeParse(
    formDataString(formData, "memberUserId")
  );
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ogiltig medlem");
  }
  return result.data;
}

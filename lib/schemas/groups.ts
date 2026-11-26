import { z } from "zod";
import { GroupClaim } from "@/app/generated/prisma/enums";
import { formDataString } from "@/lib/schemas/form-data";

export const groupNameSchema = z.string().trim().min(1, { error: "Gruppnamn krävs" });

export const groupSlugSchema = z.string().trim().min(1, { error: "Ogiltig grupp" });

export const inviteEmailSchema = z
  .string()
  .trim()
  .min(1, { error: "E-post krävs" })
  .pipe(z.email({ error: "Ange en giltig e-postadress" }))
  .transform((s) => s.toLowerCase());

export const GROUP_DESCRIPTION_MAX_LENGTH = 5_000;

/** The Group description as saved: trimmed, and blank meaning the Group has none. */
export const groupDescriptionSchema = z
  .string()
  // Forms post line breaks as CRLF while the textarea's maxLength counts one
  // character each, so count them the same way here.
  .transform((text) => text.replace(/\r\n?/g, "\n"))
  .pipe(
    z
      .string()
      .trim()
      .max(GROUP_DESCRIPTION_MAX_LENGTH, { error: "Beskrivningen får vara högst 5 000 tecken" })
      .transform((text) => text || null),
  );

export const memberUserIdSchema = z.string().trim().min(1, { error: "Ogiltig medlem" });

export const invitationIdSchema = z.uuid({ error: "Ogiltig inbjudan" });

export const groupClaimSchema = z.enum(GroupClaim, {
  error: "Ogiltig behörighet",
});

export function parseGroupNameFromFormData(formData: FormData): string {
  const result = groupNameSchema.safeParse(formDataString(formData, "name"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Gruppnamn krävs");
  }
  return result.data;
}

/**
 * Whether the create dialog's confirmation is ticked: the user is starting a new
 * Group and becomes its Creator. A checkbox posts its field only when ticked.
 */
export function parseGroupCreationConfirmedFromFormData(formData: FormData): boolean {
  return formData.has("confirmed");
}

export function parseGroupSlugFromFormData(formData: FormData): string {
  const result = groupSlugSchema.safeParse(formDataString(formData, "groupSlug"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ogiltig grupp");
  }
  return result.data;
}

export function parseMemberUserIdFromFormData(formData: FormData): string {
  const result = memberUserIdSchema.safeParse(formDataString(formData, "memberUserId"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ogiltig medlem");
  }
  return result.data;
}

export function parseInvitationIdFromFormData(formData: FormData): string {
  const result = invitationIdSchema.safeParse(formDataString(formData, "invitationId"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ogiltig inbjudan");
  }
  return result.data;
}

/** Reads the repeated `claims` field as a Member's complete Claim set; empty means none. */
export function parseGroupClaimsFromFormData(formData: FormData): GroupClaim[] {
  const result = z.array(groupClaimSchema).safeParse(formData.getAll("claims"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ogiltig behörighet");
  }
  return [...new Set(result.data)];
}

/** Reads the `description` field as the Group description to save: `null` when blank. */
export function parseGroupDescriptionFromFormData(formData: FormData): string | null {
  const result = groupDescriptionSchema.safeParse(formDataString(formData, "description"));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Ogiltig beskrivning");
  }
  return result.data;
}

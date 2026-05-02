import { z } from "zod";

/** Same rules as the hidden `next` field on login/signup: internal paths only, default `/app`. */
export function parseRedirectPathFromValue(value: unknown): string {
  if (typeof value === "string" && value.startsWith("/")) {
    return value;
  }
  return "/app";
}

export function parseRedirectPathFromFormData(
  formData: FormData,
  field = "next"
): string {
  return parseRedirectPathFromValue(formData.get(field));
}

export const loginCredentialsSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(1),
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;

export type LoginFormParseResult =
  | { ok: true; data: LoginCredentials & { redirectTo: string } }
  | { ok: false };

export function parseLoginFormData(formData: FormData): LoginFormParseResult {
  const redirectTo = parseRedirectPathFromFormData(formData);
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");
  if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
    return { ok: false };
  }
  const parsed = loginCredentialsSchema.safeParse({
    email: emailRaw,
    password: passwordRaw,
  });
  if (!parsed.success) {
    return { ok: false };
  }
  return { ok: true, data: { ...parsed.data, redirectTo } };
}

export const signupCredentialsSchema = z.object({
  name: z.string().trim(),
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(12),
});

export type SignupCredentials = z.infer<typeof signupCredentialsSchema>;

export type SignupFormParseError =
  | "Ogiltiga formulärdata"
  | "Lösenordet måste vara minst 12 tecken";

export type SignupFormParseResult =
  | { ok: true; data: SignupCredentials & { redirectTo: string } }
  | { ok: false; error: SignupFormParseError };

function mapSignupSchemaFailure(error: z.ZodError): SignupFormParseError {
  for (const issue of error.issues) {
    if (issue.path[0] === "password" && issue.code === "too_small") {
      return "Lösenordet måste vara minst 12 tecken";
    }
  }
  return "Ogiltiga formulärdata";
}

export function parseSignupFormData(formData: FormData): SignupFormParseResult {
  const redirectTo = parseRedirectPathFromFormData(formData);
  const nameRaw = formData.get("name");
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");
  if (
    typeof nameRaw !== "string" ||
    typeof emailRaw !== "string" ||
    typeof passwordRaw !== "string"
  ) {
    return { ok: false, error: "Ogiltiga formulärdata" };
  }
  const parsed = signupCredentialsSchema.safeParse({
    name: nameRaw,
    email: emailRaw,
    password: passwordRaw,
  });
  if (!parsed.success) {
    return { ok: false, error: mapSignupSchemaFailure(parsed.error) };
  }
  return { ok: true, data: { ...parsed.data, redirectTo } };
}

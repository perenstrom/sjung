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

/** The submitted email, trimmed, echoed back after a failed submit. Never the password. */
export type LoginFormValues = { email: string };

export type LoginFormParseResult =
  | { ok: true; data: LoginCredentials & { redirectTo: string } }
  | { ok: false; values: LoginFormValues };

export function parseLoginFormData(formData: FormData): LoginFormParseResult {
  const redirectTo = parseRedirectPathFromFormData(formData);
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");
  const values: LoginFormValues = {
    email: typeof emailRaw === "string" ? emailRaw.trim() : "",
  };
  if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
    return { ok: false, values };
  }
  const parsed = loginCredentialsSchema.safeParse({
    email: emailRaw,
    password: passwordRaw,
  });
  if (!parsed.success) {
    return { ok: false, values };
  }
  return { ok: true, data: { ...parsed.data, redirectTo } };
}

export const SIGNUP_PASSWORD_MIN_LENGTH = 12;

export const signupCredentialsSchema = z.object({
  name: z.string().trim(),
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(SIGNUP_PASSWORD_MIN_LENGTH),
});

export type SignupCredentials = z.infer<typeof signupCredentialsSchema>;

export type SignupFormParseError =
  | "Ogiltiga formulärdata"
  | "Lösenordet måste vara minst 12 tecken";

/** The submitted non-secret fields, trimmed, echoed back after a failed submit. Never the password. */
export type SignupFormValues = { name: string; email: string };

export type SignupFormParseResult =
  | { ok: true; data: SignupCredentials & { redirectTo: string } }
  | { ok: false; error: SignupFormParseError; values: SignupFormValues };

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
  const values: SignupFormValues = {
    name: typeof nameRaw === "string" ? nameRaw.trim() : "",
    email: typeof emailRaw === "string" ? emailRaw.trim() : "",
  };
  if (
    typeof nameRaw !== "string" ||
    typeof emailRaw !== "string" ||
    typeof passwordRaw !== "string"
  ) {
    return { ok: false, error: "Ogiltiga formulärdata", values };
  }
  const parsed = signupCredentialsSchema.safeParse({
    name: nameRaw,
    email: emailRaw,
    password: passwordRaw,
  });
  if (!parsed.success) {
    return { ok: false, error: mapSignupSchemaFailure(parsed.error), values };
  }
  return { ok: true, data: { ...parsed.data, redirectTo } };
}

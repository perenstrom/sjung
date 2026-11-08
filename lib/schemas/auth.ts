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

/** An email address as typed into any auth form: trimmed, then validated. */
export const emailSchema = z.string().trim().pipe(z.email());

export const loginCredentialsSchema = z.object({
  email: emailSchema,
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

export const PASSWORD_MIN_LENGTH = 12;

/** A new password, asked for twice. Shared by signup and Password reset. */
const newPasswordFields = {
  password: z.string().min(PASSWORD_MIN_LENGTH),
  passwordConfirmation: z.string(),
};

function passwordsMatch(data: { password: string; passwordConfirmation: string }) {
  return data.password === data.passwordConfirmation;
}

const passwordMismatch = { path: ["passwordConfirmation"] };

export const signupCredentialsSchema = z
  .object({
    name: z.string().trim(),
    email: emailSchema,
    ...newPasswordFields,
  })
  .refine(passwordsMatch, passwordMismatch)
  // The confirmation has done its job; keep a second copy of the password out of the result.
  .transform(({ name, email, password }) => ({ name, email, password }));

export type SignupCredentials = z.output<typeof signupCredentialsSchema>;

export type NewPasswordParseError =
  | "Ogiltiga formulärdata"
  | "Lösenordet måste vara minst 12 tecken"
  | "Lösenorden matchar inte";

function mapNewPasswordSchemaFailure(error: z.ZodError): NewPasswordParseError {
  for (const issue of error.issues) {
    if (issue.path[0] === "password" && issue.code === "too_small") {
      return "Lösenordet måste vara minst 12 tecken";
    }
  }
  for (const issue of error.issues) {
    if (issue.path[0] === "passwordConfirmation" && issue.code === "custom") {
      return "Lösenorden matchar inte";
    }
  }
  return "Ogiltiga formulärdata";
}

/** The submitted non-secret fields, trimmed, echoed back after a failed submit. Never the passwords. */
export type SignupFormValues = { name: string; email: string };

export type SignupFormParseResult =
  | { ok: true; data: SignupCredentials & { redirectTo: string } }
  | { ok: false; error: NewPasswordParseError; values: SignupFormValues };

export function parseSignupFormData(formData: FormData): SignupFormParseResult {
  const redirectTo = parseRedirectPathFromFormData(formData);
  const nameRaw = formData.get("name");
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");
  const passwordConfirmationRaw = formData.get("passwordConfirmation");
  const values: SignupFormValues = {
    name: typeof nameRaw === "string" ? nameRaw.trim() : "",
    email: typeof emailRaw === "string" ? emailRaw.trim() : "",
  };
  if (
    typeof nameRaw !== "string" ||
    typeof emailRaw !== "string" ||
    typeof passwordRaw !== "string" ||
    typeof passwordConfirmationRaw !== "string"
  ) {
    return { ok: false, error: "Ogiltiga formulärdata", values };
  }
  const parsed = signupCredentialsSchema.safeParse({
    name: nameRaw,
    email: emailRaw,
    password: passwordRaw,
    passwordConfirmation: passwordConfirmationRaw,
  });
  if (!parsed.success) {
    return { ok: false, error: mapNewPasswordSchemaFailure(parsed.error), values };
  }
  return { ok: true, data: { ...parsed.data, redirectTo } };
}

const newPasswordSchema = z
  .object({ token: z.string().min(1), ...newPasswordFields })
  .refine(passwordsMatch, passwordMismatch)
  .transform(({ token, password }) => ({ token, password }));

export type NewPasswordFormParseResult =
  | { ok: true; data: { token: string; password: string } }
  | { ok: false; error: NewPasswordParseError };

/** The Password reset's "new password" form: the emailed token plus the password twice. */
export function parseNewPasswordFormData(formData: FormData): NewPasswordFormParseResult {
  const tokenRaw = formData.get("token");
  const passwordRaw = formData.get("password");
  const passwordConfirmationRaw = formData.get("passwordConfirmation");
  if (
    typeof tokenRaw !== "string" ||
    typeof passwordRaw !== "string" ||
    typeof passwordConfirmationRaw !== "string"
  ) {
    return { ok: false, error: "Ogiltiga formulärdata" };
  }
  const parsed = newPasswordSchema.safeParse({
    token: tokenRaw,
    password: passwordRaw,
    passwordConfirmation: passwordConfirmationRaw,
  });
  if (!parsed.success) {
    return { ok: false, error: mapNewPasswordSchemaFailure(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

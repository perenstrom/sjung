"use server";

import argon2 from "argon2";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalize-email";
import { signIn, signOut } from "@/auth";
import {
  confirmEmailVerification,
  resendVerificationEmail,
  sendVerificationEmail,
} from "@/lib/auth/email-verification";
import { completePasswordReset, requestPasswordReset } from "@/lib/auth/password-reset";
import { getSessionUser } from "@/lib/auth/require-user";
import {
  CONFIRM_EMAIL_PATH,
  loginPath,
  NEW_PASSWORD_PATH,
  VERIFY_EMAIL_PATH,
  VERIFY_EMAIL_SEND_FAILED_PATH,
} from "@/lib/auth/routes";
import {
  emailSchema,
  parseLoginFormData,
  parseNewPasswordFormData,
  parseSignupFormData,
  type LoginFormValues,
  type NewPasswordParseError,
  type SignupFormValues,
} from "@/lib/schemas/auth";

/** `useActionState` state for the login form: `null` until a submit fails. */
export type LoginFormState = {
  error: "Ogiltiga inloggningsuppgifter" | "Fel e-post eller lösenord";
  values: LoginFormValues;
} | null;

/** `useActionState` state for the signup form: `null` until a submit fails. */
export type SignupFormState = {
  error: NewPasswordParseError | "E-postadressen används redan";
  values: SignupFormValues;
} | null;

export async function logIn(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const parsed = parseLoginFormData(formData);
  if (!parsed.ok) {
    return { error: "Ogiltiga inloggningsuppgifter", values: parsed.values };
  }

  const { email, password, redirectTo } = parsed.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (signInError) {
    if (signInError instanceof AuthError) {
      return { error: "Fel e-post eller lösenord", values: { email } };
    }
    throw signInError;
  }
  return null;
}

export async function logOut() {
  await signOut({ redirectTo: "/" });
}

export async function signUp(
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const parsed = parseSignupFormData(formData);
  if (!parsed.ok) {
    return { error: parsed.error, values: parsed.values };
  }

  // `next` is not used: a new User is held on the verify-email page until Verified.
  const { name, email, password } = parsed.data;

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existingUser) {
    return { error: "E-postadressen används redan", values: { name, email } };
  }

  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: {
      name: name || normalizedEmail,
      email: normalizedEmail,
      passwordHash,
    },
    select: { id: true, email: true },
  });

  // A failed send keeps the User: they're signed in anyway and the
  // verify-email page offers to try again.
  let emailSent = true;
  try {
    await sendVerificationEmail(user.id);
  } catch (sendError) {
    console.error("Kunde inte skicka verifieringsmejl vid registrering", sendError);
    emailSent = false;
  }

  await signIn("credentials", {
    email: user.email,
    password,
    redirectTo: emailSent ? VERIFY_EMAIL_PATH : VERIFY_EMAIL_SEND_FAILED_PATH,
  });
  return null;
}

/** `useActionState` state for "Skicka igen" on the verify-email page. */
export type ResendVerificationState =
  | { status: "sent" }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "failed" }
  | null;

export async function resendVerification(
  _prevState: ResendVerificationState
): Promise<ResendVerificationState> {
  const user = await getSessionUser();
  if (!user) {
    redirect(loginPath(VERIFY_EMAIL_PATH));
  }
  if (user.emailVerifiedAt) {
    redirect("/app");
  }

  try {
    const result = await resendVerificationEmail(user.id);
    return result.ok
      ? { status: "sent" }
      : { status: "cooldown", retryAfterSeconds: result.retryAfterSeconds };
  } catch (sendError) {
    console.error("Kunde inte skicka verifieringsmejl", sendError);
    return { status: "failed" };
  }
}

/**
 * The button POST from the confirm page — the only place a verification token
 * is used. Needs no session, so the link works from another device.
 */
export async function confirmEmail(formData: FormData) {
  const token = formData.get("token");
  if (typeof token !== "string" || token === "") {
    redirect(CONFIRM_EMAIL_PATH);
  }

  const result = await confirmEmailVerification(token);
  if (!result.ok) {
    // Back to the confirm page, which explains what's wrong with the token.
    redirect(`${CONFIRM_EMAIL_PATH}?token=${encodeURIComponent(token)}`);
  }

  const sessionUser = await getSessionUser();
  redirect(sessionUser ? "/app" : "/auth/login?bekraftad=1");
}

/** `useActionState` state for the "Glömt lösenord" form. */
export type RequestPasswordResetState =
  | { status: "sent"; email: string }
  | { status: "error"; error: "Ange en giltig e-postadress"; values: { email: string } }
  | null;

/**
 * "Glömt lösenord". Answers "sent" for every well-formed address, whether or
 * not it has an account, so the form can't be used to find out who does.
 */
export async function requestPasswordResetForm(
  _prevState: RequestPasswordResetState,
  formData: FormData
): Promise<RequestPasswordResetState> {
  const emailRaw = formData.get("email");
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  if (!emailSchema.safeParse(email).success) {
    return { status: "error", error: "Ange en giltig e-postadress", values: { email } };
  }

  // Looked up and sent after the response, so an existing account doesn't
  // make the answer measurably slower than a missing one.
  after(() => requestPasswordReset(email));
  return { status: "sent", email };
}

/** `useActionState` state for the new-password form: `null` until a submit fails. */
export type NewPasswordFormState = { error: NewPasswordParseError } | null;

/**
 * The new-password form's POST — the only place a reset token is used. On
 * success every session of the User is revoked, this browser's included, so
 * it logs out here too (clearing the cookie) and goes to the login page.
 */
export async function setNewPassword(
  _prevState: NewPasswordFormState,
  formData: FormData
): Promise<NewPasswordFormState> {
  const parsed = parseNewPasswordFormData(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const { token, password } = parsed.data;
  const result = await completePasswordReset(token, password);
  if (!result.ok) {
    // Back to the link page, which explains what's wrong with the token.
    redirect(`${NEW_PASSWORD_PATH}?token=${encodeURIComponent(token)}`);
  }

  await signOut({ redirectTo: "/auth/login?aterstallt=1" });
  return null;
}

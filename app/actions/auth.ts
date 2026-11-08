"use server";

import argon2 from "argon2";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import {
  confirmEmailVerification,
  resendVerificationEmail,
  sendVerificationEmail,
} from "@/lib/auth/email-verification";
import { getSessionUser } from "@/lib/auth/require-user";
import {
  CONFIRM_EMAIL_PATH,
  VERIFY_EMAIL_PATH,
  VERIFY_EMAIL_SEND_FAILED_PATH,
} from "@/lib/auth/verify-email-routes";
import {
  parseLoginFormData,
  parseSignupFormData,
  type LoginFormValues,
  type SignupFormParseError,
  type SignupFormValues,
} from "@/lib/schemas/auth";

/** `useActionState` state for the login form: `null` until a submit fails. */
export type LoginFormState = {
  error: "Ogiltiga inloggningsuppgifter" | "Fel e-post eller lösenord";
  values: LoginFormValues;
} | null;

/** `useActionState` state for the signup form: `null` until a submit fails. */
export type SignupFormState = {
  error: SignupFormParseError | "E-postadressen används redan";
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

  const normalizedEmail = email.toLowerCase().trim();
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
    redirect(`/auth/login?next=${encodeURIComponent(VERIFY_EMAIL_PATH)}`);
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

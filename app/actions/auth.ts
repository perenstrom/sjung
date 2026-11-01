"use server";

import argon2 from "argon2";
import { AuthError } from "next-auth";
import prisma from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
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

  const { name, email, password, redirectTo } = parsed.data;

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
    select: { email: true },
  });

  await signIn("credentials", {
    email: user.email,
    password,
    redirectTo,
  });
  return null;
}

"use server";

import argon2 from "argon2";
import prisma from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import {
  parseSignupFormData,
  type SignupFormParseError,
  type SignupFormValues,
} from "@/lib/schemas/auth";

/** `useActionState` state for the signup form: `null` until a submit fails. */
export type SignupFormState = {
  error: SignupFormParseError | "E-postadressen används redan";
  values: SignupFormValues;
} | null;

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

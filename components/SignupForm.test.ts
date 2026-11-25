import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { SignupForm } from "./SignupForm";
import { renderMarkup, textOf } from "@/lib/testing/markup";

// The form posts to server actions, which reach the database.
vi.mock("@/app/actions/auth", () => ({ signUp: vi.fn(), signUpFromInvitationForm: vi.fn() }));

describe("SignupForm", () => {
  // The name field is the same with or without an Invitation.
  it("asks for a full name, with a hint saying who sees it", () => {
    const html = renderMarkup(createElement(SignupForm, { nextPath: "/app" }));

    expect(textOf(html)).toContain("För- och efternamn");
    const nameInput = html.match(/<input[^>]*name="name"[^>]*>/)?.[0];
    const hintId = nameInput?.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(hintId).toBeDefined();
    expect(html).toMatch(new RegExp(`<p[^>]*id="${hintId}"[^>]*>Så ser de andra i gruppen dig\\.</p>`));
  });
});

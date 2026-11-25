import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { SignupForm } from "./SignupForm";
import { renderMarkup, textOf } from "@/lib/testing/markup";

// The form posts to server actions, which reach the database.
vi.mock("@/app/actions/auth", () => ({ signUp: vi.fn(), signUpFromInvitationForm: vi.fn() }));

describe("SignupForm", () => {
  it("asks for a full name", () => {
    const html = renderMarkup(createElement(SignupForm, { nextPath: "/app" }));

    expect(textOf(html)).toContain("För- och efternamn");
  });
});

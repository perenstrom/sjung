import { describe, expect, it } from "vitest";

import { FEEDBACK_MAX_LENGTH, parseFeedbackForm } from "@/lib/schemas/feedback";
import { formData } from "@/__tests__/support/form-data";

const context = { pagePath: "/app/korus/setlists", groupSlug: "korus", userAgent: "Firefox" };

describe("parseFeedbackForm", () => {
  it("trims the message and reads the page context", () => {
    expect(parseFeedbackForm(formData({ message: "  Bra app!  ", ...context }))).toEqual({
      success: true,
      data: { message: "Bra app!", ...context },
    });
  });

  it("treats a missing or empty Group slug as none", () => {
    const result = parseFeedbackForm(formData({ message: "Hej", pagePath: "/app/me", groupSlug: "", userAgent: "" }));

    expect(result).toMatchObject({ success: true, data: { groupSlug: null, userAgent: "" } });
  });

  it("rejects a blank message, keeping what was typed trimmed", () => {
    expect(parseFeedbackForm(formData({ message: "   ", ...context }))).toEqual({
      success: false,
      error: "Skriv din feedback innan du skickar",
      values: { message: "" },
    });
  });

  it("rejects a message over the limit", () => {
    const long = "a".repeat(FEEDBACK_MAX_LENGTH + 1);

    expect(parseFeedbackForm(formData({ message: long, ...context }))).toEqual({
      success: false,
      error: "Feedbacken får vara högst 5 000 tecken",
      values: { message: long },
    });
  });

  it("accepts a message exactly at the limit", () => {
    const max = "a".repeat(FEEDBACK_MAX_LENGTH);

    expect(parseFeedbackForm(formData({ message: max, ...context }))).toMatchObject({ success: true });
  });

  it("caps the context fields so a crafted post can't make them huge", () => {
    const result = parseFeedbackForm(
      formData({ message: "Hej", pagePath: "/".repeat(5000), groupSlug: "g".repeat(5000), userAgent: "u".repeat(5000) })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pagePath).toHaveLength(500);
      expect(result.data.groupSlug).toHaveLength(500);
      expect(result.data.userAgent).toHaveLength(500);
    }
  });
});

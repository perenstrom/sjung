import { z } from "zod";
import { formDataString } from "@/lib/schemas/form-data";

export const FEEDBACK_MAX_LENGTH = 5000;

/** What the sender sees whenever Feedback couldn't be sent, whatever the cause. */
export const FEEDBACK_SEND_FAILED = "Kunde inte skicka feedback. Försök igen.";

/** Page context fields come from the browser; capped so a crafted post can't bloat the email. */
const CONTEXT_MAX_LENGTH = 500;

export const feedbackMessageSchema = z
  .string()
  .trim()
  .min(1, { error: "Skriv din feedback innan du skickar" })
  .max(FEEDBACK_MAX_LENGTH, { error: "Feedbacken får vara högst 5 000 tecken" });

/** What a Feedback form submits: the message and where it was written. */
export type FeedbackForm = {
  message: string;
  pagePath: string;
  /** The Group whose pages the dialog was opened on, if any. */
  groupSlug: string | null;
  userAgent: string;
};

export type ParseFeedbackFormResult =
  | { success: true; data: FeedbackForm }
  | { success: false; error: string; values: { message: string } };

function contextField(formData: FormData, field: string): string {
  return formDataString(formData, field).trim().slice(0, CONTEXT_MAX_LENGTH);
}

export function parseFeedbackForm(formData: FormData): ParseFeedbackFormResult {
  const typed = formDataString(formData, "message").trim();
  const parsed = feedbackMessageSchema.safeParse(typed);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Ogiltig feedback",
      values: { message: typed },
    };
  }

  return {
    success: true,
    data: {
      message: parsed.data,
      pagePath: contextField(formData, "pagePath"),
      groupSlug: contextField(formData, "groupSlug") || null,
      userAgent: contextField(formData, "userAgent"),
    },
  };
}

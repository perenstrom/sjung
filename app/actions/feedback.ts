"use server";

import { requireUser } from "@/lib/auth/require-user";
import { sendFeedbackEmail } from "@/lib/feedback/feedback";
import { FEEDBACK_SEND_FAILED, parseFeedbackForm } from "@/lib/schemas/feedback";

/** `useActionState` state for the Feedback dialog. */
export type SendFeedbackState =
  | { status: "sent" }
  | { status: "error"; error: string; values: { message: string } }
  | null;

/** "Skicka feedback": emails the signed-in Verified user's Feedback to the people running Sjung. */
export async function sendFeedback(
  _prevState: SendFeedbackState,
  formData: FormData
): Promise<SendFeedbackState> {
  const user = await requireUser();

  const parsed = parseFeedbackForm(formData);
  if (!parsed.success) {
    return { status: "error", error: parsed.error, values: parsed.values };
  }

  try {
    await sendFeedbackEmail(user, parsed.data);
  } catch (error) {
    console.error("Kunde inte skicka feedback", error);
    return {
      status: "error",
      error: FEEDBACK_SEND_FAILED,
      values: { message: parsed.data.message },
    };
  }

  return { status: "sent" };
}

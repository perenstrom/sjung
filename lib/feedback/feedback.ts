import { createElement } from "react";
import { getAppEnvironment } from "@/lib/app-environment";
import { emailRecipientFromEnv, sendEmail } from "@/lib/email";
import { FeedbackEmail, feedbackEmailSubject, type FeedbackSender } from "@/lib/feedback/feedback-email";
import type { FeedbackForm } from "@/lib/schemas/feedback";

/**
 * Emails a Verified user's Feedback to the people running Sjung
 * (FEEDBACK_EMAIL_TO), with the sender as reply-to so answering reaches them.
 * Throws when it can't be sent, including when FEEDBACK_EMAIL_TO is missing.
 */
export async function sendFeedbackEmail(sender: FeedbackSender, feedback: FeedbackForm): Promise<void> {
  const environment = getAppEnvironment();

  await sendEmail({
    to: emailRecipientFromEnv("FEEDBACK_EMAIL_TO"),
    replyTo: sender.email,
    subject: feedbackEmailSubject(environment, sender.name),
    react: createElement(FeedbackEmail, {
      ...feedback,
      sender: { name: sender.name, email: sender.email },
      environment,
    }),
  });
}

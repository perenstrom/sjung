"use client";

import { useActionState, useState } from "react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { sendFeedback, type SendFeedbackState } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { FEEDBACK_SEND_FAILED } from "@/lib/schemas/feedback";

type FeedbackDialogProps = {
  /** The page the dialog is opened from, sent along as context. */
  pagePath: string;
  /** The Group whose pages the dialog is opened on, if any. */
  groupSlug: string | null;
};

/** The sidebar's "Feedback" item and the dialog it opens for sending Feedback about Sjung. */
export function FeedbackDialog({ pagePath, groupSlug }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prevState: SendFeedbackState, formData: FormData): Promise<SendFeedbackState> => {
      let result: SendFeedbackState;
      try {
        result = await sendFeedback(prevState, formData);
      } catch {
        // E.g. the network or the session went away: keep what was typed.
        const typed = formData.get("message");
        return {
          status: "error",
          error: FEEDBACK_SEND_FAILED,
          values: { message: typeof typed === "string" ? typed : "" },
        };
      }
      if (result?.status === "sent") {
        setOpen(false);
        toast.success("Tack för din feedback!");
      }
      return result;
    },
    null
  );

  const error = state?.status === "error" ? state.error : null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip="Feedback" onClick={() => setOpen(true)}>
        <MessageSquare />
        <span>Feedback</span>
      </SidebarMenuButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback</DialogTitle>
            <DialogDescription>
              Berätta vad som krånglar eller vad du saknar i Sjung.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="pagePath" value={pagePath} />
            <input type="hidden" name="groupSlug" value={groupSlug ?? ""} />
            <input
              type="hidden"
              name="userAgent"
              value={typeof navigator === "undefined" ? "" : navigator.userAgent}
            />
            <div className="space-y-2">
              <Label htmlFor="feedback-message">Din feedback</Label>
              {/* Keyed so a sent message clears the field, while a failed one keeps what was typed. */}
              <Textarea
                key={state?.status === "error" ? `error-${state.values.message}` : state?.status ?? "new"}
                id="feedback-message"
                name="message"
                defaultValue={state?.status === "error" ? state.values.message : undefined}
                required
                autoFocus
                rows={6}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "feedback-error" : undefined}
              />
            </div>
            {error ? (
              <p id="feedback-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                Skicka feedback
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  );
}

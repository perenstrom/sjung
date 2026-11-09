"use client";

import { RotateCw, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { resendGroupInvitation, revokeGroupInvitation } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getThrownMessage } from "@/lib/getThrownMessage";

/** "Skicka igen" and "Ta bort" for one listed Invitation. Neither asks for confirmation. */
export function GroupInvitationActions({
  groupSlug,
  invitation,
}: {
  groupSlug: string;
  invitation: { id: string; email: string };
}) {
  const [isPending, startTransition] = useTransition();

  function invitationForm() {
    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("invitationId", invitation.id);
    return formData;
  }

  function resend() {
    startTransition(async () => {
      try {
        const result = await resendGroupInvitation(invitationForm());
        if (result.ok) {
          toast.success(`Inbjudan skickad igen till ${result.email}`);
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        toast.error(getThrownMessage(err, "Kunde inte skicka inbjudan, försök igen"));
      }
    });
  }

  function revoke() {
    startTransition(async () => {
      try {
        await revokeGroupInvitation(invitationForm());
        toast.success(`Inbjudan till ${invitation.email} har tagits bort`);
      } catch (err) {
        toast.error(getThrownMessage(err, "Kunde inte ta bort inbjudan"));
      }
    });
  }

  return (
    <div className="flex gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={isPending}
            onClick={resend}
            aria-label={`Skicka inbjudan till ${invitation.email} igen`}
          >
            <RotateCw className="size-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Skicka igen</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={revoke}
            aria-label={`Ta bort inbjudan till ${invitation.email}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ta bort</TooltipContent>
      </Tooltip>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { markAllAnnouncementsRead } from "@/app/actions/announcements";
import { Button } from "@/components/ui/button";

const LABEL = "Markera alla som lästa";

export function MarkAllAnnouncementsReadButton({ disabled }: { disabled: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await markAllAnnouncementsRead();
      } catch {
        toast.error("Kunde inte markera nyheterna som lästa");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={disabled || isPending}
      title={LABEL}
      aria-label={LABEL}
    >
      <CheckCheck />
    </Button>
  );
}

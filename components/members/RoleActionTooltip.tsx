"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * The tooltip on a Role's action button: its label, or why it is disabled.
 * A disabled button gets no pointer events, so the tooltip hangs off a
 * focusable wrapper instead.
 */
export function RoleActionTooltip({
  label,
  disabledReason,
  children,
}: {
  label: string;
  disabledReason?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={disabledReason ? 0 : undefined}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>{disabledReason ?? label}</TooltipContent>
    </Tooltip>
  );
}

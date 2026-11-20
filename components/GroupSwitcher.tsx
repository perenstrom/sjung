"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveGroup } from "@/app/actions/groups";
import { closeMobileSidebar, switchGroup } from "@/lib/sidebar-navigation";

type GroupSwitcherProps = {
  groups: { id: string; name: string; slug: string }[];
  currentGroupSlug: string;
};

/** Switches the User between their Groups. Renders nothing with fewer than two. */
export function GroupSwitcher({ groups, currentGroupSlug }: GroupSwitcherProps) {
  const router = useRouter();
  const sidebar = useSidebar();
  const [groupSwitchError, setGroupSwitchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (groups.length < 2) {
    return null;
  }

  function handleGroupChange(nextGroupSlug: string) {
    if (!nextGroupSlug || nextGroupSlug === currentGroupSlug) {
      return;
    }

    startTransition(async () => {
      setGroupSwitchError(null);
      const error = await switchGroup(nextGroupSlug, {
        setActiveGroup,
        navigate: (href) => router.push(href),
        onSwitched: () => closeMobileSidebar(sidebar),
      });
      setGroupSwitchError(error);
    });
  }

  return (
    <div className="space-y-1">
      <Select
        value={currentGroupSlug}
        onValueChange={handleGroupChange}
        disabled={isPending}
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue placeholder="Välj grupp" />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.slug}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {groupSwitchError ? (
        <p role="status" aria-live="polite" className="text-sm text-destructive">
          {groupSwitchError}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeftRight, Check } from "lucide-react";
import { toast } from "sonner";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveGroup } from "@/app/actions/groups";
import { closeMobileSidebar, switchGroup } from "@/lib/sidebar-navigation";

/** A Group the User can switch to. */
export type SwitchableGroup = { id: string; name: string; slug: string };

type GroupSwitcherProps = {
  groups: SwitchableGroup[];
  currentGroupSlug: string;
};

/**
 * Switches the User between their Groups. Renders nothing with fewer than two.
 * A select in the expanded sidebar; an icon button with a menu when the
 * sidebar is collapsed to icons, which has no room for the select or its error.
 */
export function GroupSwitcher({ groups, currentGroupSlug }: GroupSwitcherProps) {
  const router = useRouter();
  const sidebar = useSidebar();
  const [groupSwitchError, setGroupSwitchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isCollapsed = sidebar.state === "collapsed" && !sidebar.isMobile;

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
      if (error && isCollapsed) {
        toast.error(error);
        return;
      }
      setGroupSwitchError(error);
    });
  }

  if (isCollapsed) {
    const currentGroupName =
      groups.find((group) => group.slug === currentGroupSlug)?.name ?? "Välj grupp";

    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                // Hidden while the menu is open, so it doesn't sit behind it.
                tooltip={{
                  children: `Byt grupp (nu: ${currentGroupName})`,
                  hidden: isMenuOpen,
                }}
                disabled={isPending}
              >
                <ArrowLeftRight />
                <span>Byt grupp</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              {groups.map((group) => {
                const isCurrent = group.slug === currentGroupSlug;
                return (
                  <DropdownMenuItem
                    key={group.id}
                    onSelect={() => handleGroupChange(group.slug)}
                    aria-current={isCurrent ? "true" : undefined}
                  >
                    <span className="flex-1">{group.name}</span>
                    {isCurrent ? <Check aria-label="Nuvarande grupp" /> : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
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

import type { ReactNode } from "react";
import { PublicFooter } from "@/components/legal/PublicFooter";
import { cn } from "@/lib/utils";

type PublicPageShellProps = {
  children: ReactNode;
  /** Classes for the `<main>`, which already fills the height above the footer. */
  className?: string;
};

/** The frame of every page outside `/app`: the page's content with the public footer beneath. */
export function PublicPageShell({ children, className }: PublicPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className={cn("mx-auto w-full flex-1", className)}>{children}</main>
      <PublicFooter />
    </div>
  );
}

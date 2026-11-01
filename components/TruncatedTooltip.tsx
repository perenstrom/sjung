"use client";

import { useEffect, useState, type ReactElement } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Shows `content` in a tooltip on hover, but only while the child (which must
 * truncate its own text, e.g. with `truncate`) is actually cut off.
 */
export function TruncatedTooltip({
  content,
  children,
}: {
  content: string;
  children: ReactElement;
}) {
  // A callback ref, since the child may be any element (button, link, …).
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!element) {
      return;
    }

    const measure = () =>
      setIsTruncated(element.scrollWidth > element.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, content]);

  return (
    <Tooltip open={open && isTruncated} onOpenChange={setOpen}>
      <TooltipTrigger asChild ref={setElement}>
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-80 break-words">{content}</TooltipContent>
    </Tooltip>
  );
}

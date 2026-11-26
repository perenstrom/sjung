"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { GROUP_DESCRIPTION_PROSE } from "@/components/home/group-description-prose";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The Group description's Markdown. Below `md` it is collapsed to four lines,
 * fading into the page, with _Visa mer_ to show it all; only when it doesn't
 * fit, and never remembered, so every visit starts collapsed. From `md` up it
 * always shows in full.
 */
export function CollapsibleGroupDescription({ description }: { description: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Measured only while collapsed: expanded, everything fits.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || expanded) {
      return;
    }
    const measure = () => setOverflows(body.scrollHeight > body.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    // Crossing `md` lifts the clamp, and a narrower screen wraps more lines.
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [description, expanded]);

  const collapsed = !expanded && overflows;

  return (
    <div>
      {/* `leading-7` is the prose line height, so `lh` below is one line of the description. */}
      <div className="relative leading-7">
        <div ref={bodyRef} className={cn(!expanded && "max-md:max-h-[4lh] max-md:overflow-hidden")}>
          <MarkdownBody markdown={description} className={GROUP_DESCRIPTION_PROSE} />
        </div>
        {collapsed ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[1lh] bg-linear-to-t from-background md:hidden"
          />
        ) : null}
      </div>
      {overflows ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-0 md:hidden"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Visa mindre" : "Visa mer"}
        </Button>
      ) : null}
    </div>
  );
}

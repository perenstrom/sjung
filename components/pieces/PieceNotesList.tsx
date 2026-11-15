"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A piece's Piece notes as text, in the order given, for the pieces list
 * (the desktop Anteckningar cell and the mobile row's Anteckningar section).
 * Each note is cut off after 3 lines; a cut-off note expands in place when
 * clicked, and collapses again on a second click. Renders nothing without notes.
 */
export function PieceNotesList({
  notes,
}: {
  notes: ReadonlyArray<{ id: string; content: string }>;
}) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-1.5">
      {notes.map((note) => (
        <li key={note.id}>
          <ClampedNote content={note.content} />
        </li>
      ))}
    </ul>
  );
}

function ClampedNote({ content }: { content: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [cutOff, setCutOff] = useState(false);

  // Whether the 3-line clamp hides anything depends on the rendered width, so
  // measure it, and again whenever the width changes. While expanded the
  // clamp is off and there is nothing to measure; keep the last answer.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || expanded) return;

    const measure = () => setCutOff(element.scrollHeight > element.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [content, expanded]);

  const toggle = () => setExpanded((value) => !value);
  const interactive = cutOff || expanded;

  return (
    <p
      ref={ref}
      className={cn(
        "text-sm leading-snug whitespace-pre-wrap break-words",
        !expanded && "line-clamp-3",
        interactive &&
          "focus-visible:ring-ring/50 cursor-pointer rounded-sm outline-none focus-visible:ring-[3px]",
      )}
      {...(interactive
        ? {
            role: "button",
            tabIndex: 0,
            "aria-expanded": expanded,
            title: expanded ? "Visa mindre" : "Visa hela anteckningen",
            onClick: toggle,
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle();
              }
            },
          }
        : {})}
    >
      {content}
    </p>
  );
}

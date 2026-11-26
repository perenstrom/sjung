"use client";

import { useState } from "react";
import { MarkdownBody } from "@/components/markdown/MarkdownBody";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MarkdownFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  required?: boolean;
  /** Sizes the textarea and the preview alike, e.g. a minimum height. */
  className?: string;
  /** Styles the preview to match where the text is shown, e.g. smaller headings. */
  previewClassName?: string;
};

/**
 * A Markdown textarea with a _Skriv_ / _Förhandsgranska_ switch, the preview
 * rendered by {@link MarkdownBody} exactly as readers will see it. Controlled,
 * so what was typed survives the preview and a rejected save.
 */
export function MarkdownField({
  id,
  name,
  label,
  value,
  onChange,
  maxLength,
  required,
  className,
  previewClassName,
}: MarkdownFieldProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div role="group" aria-label="Visa" className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "write" ? "secondary" : "ghost"}
            aria-pressed={mode === "write"}
            onClick={() => setMode("write")}
          >
            Skriv
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "preview" ? "secondary" : "ghost"}
            aria-pressed={mode === "preview"}
            onClick={() => setMode("preview")}
          >
            Förhandsgranska
          </Button>
        </div>
      </div>
      {/* Hidden rather than unmounted in preview, so it is still submitted. */}
      <Textarea
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        required={required}
        className={cn("font-mono", className, mode === "preview" && "hidden")}
      />
      {mode === "preview" ? (
        <div className={cn("rounded-md border px-4 py-3", className)}>
          {value.trim() ? (
            <MarkdownBody markdown={value} className={previewClassName} />
          ) : (
            <p className="text-sm text-muted-foreground">Inget att förhandsgranska än.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Markdown: rubriker, fetstil, listor, länkar och tabeller. HTML och bilder visas inte.
        </p>
      )}
    </div>
  );
}

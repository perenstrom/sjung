"use client";

// PROTOTYPE (PER-434) — state shared by the variants. Layout is NOT shared.
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { buildPreview, examplePaste, type GroupSnapshot, type ImportPreview } from "./parse";

export type ImportState = ReturnType<typeof useImportState>;

export function useImportState(group: GroupSnapshot) {
  const [text, setText] = useState("");
  const [columnUse, setColumnUse] = useState<Record<number, boolean>>({});
  const [addDuplicates, setAddDuplicates] = useState<Set<number>>(new Set());
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const preview = useMemo(
    () => buildPreview(text, group, { columnUse, addDuplicates }),
    [text, group, columnUse, addDuplicates]
  );

  return {
    text,
    setText: (t: string) => {
      setText(t);
      setColumnUse({});
      setAddDuplicates(new Set());
    },
    fillExample: () => {
      setText(examplePaste(group));
      setColumnUse({});
      setAddDuplicates(new Set());
    },
    preview,
    toggleColumn: (index: number, use: boolean) => setColumnUse((c) => ({ ...c, [index]: use })),
    toggleDuplicate: (line: number, add: boolean) =>
      setAddDuplicates((s) => {
        const next = new Set(s);
        if (add) next.add(line);
        else next.delete(line);
        return next;
      }),
    summary,
    // Stub: nothing is saved in the prototype.
    confirm: () => preview && setSummary(summarize(preview)),
    reset: () => {
      setText("");
      setColumnUse({});
      setAddDuplicates(new Set());
      setSummary(null);
    },
  };
}

export type ImportSummary = { added: number; skipped: number; peopleCreated: number; newRoles: string[] };

function summarize(p: ImportPreview): ImportSummary {
  return {
    added: p.rows.filter((r) => r.add).length,
    skipped: p.rows.filter((r) => !r.add).length + p.skipped.length,
    peopleCreated: p.newPeople.length,
    newRoles: p.newRoles,
  };
}

export function SummaryView({ summary }: { summary: ImportSummary }) {
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <SummaryStat label="Noter tillagda" value={summary.added} />
      <SummaryStat label="Noter överhoppade" value={summary.skipped} />
      <SummaryStat label="Personer skapade" value={summary.peopleCreated} />
      <SummaryStat
        label="Nya roller i gruppen"
        value={summary.newRoles.length}
        detail={summary.newRoles.join(", ")}
      />
      <p className="col-span-2 text-xs text-fuchsia-700">PROTOTYP — inget sparades.</p>
    </dl>
  );
}

function SummaryStat({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="rounded-md border p-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
      {detail ? <dd className="text-xs text-muted-foreground">{detail}</dd> : null}
    </div>
  );
}

/** Small "ny" marker. Variants style around it as they like. */
export function NewMark({ isNew, className }: { isNew: boolean; className?: string }) {
  if (!isNew) return null;
  return (
    <span
      className={cn(
        "rounded-sm bg-sky-100 px-1 text-[10px] font-semibold tracking-wide text-sky-800 uppercase dark:bg-sky-900 dark:text-sky-100",
        className
      )}
    >
      ny
    </span>
  );
}

export const delimiterLabel = { tab: "tabbar", ";": "semikolon", ",": "komma" } as const;

"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { importPieces, type PieceImportResult } from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getThrownMessage } from "@/lib/getThrownMessage";
import {
  buildImportPlan,
  importOutcome,
  MAX_IMPORT_ROWS,
  NO_IMPORT_CHOICES,
  type ImportChoices,
  type ImportDelimiter,
  type ImportGroup,
} from "@/lib/pieces/import";
import { PieceImportPreview } from "./PieceImportPreview";

const DELIMITER_LABELS: Record<ImportDelimiter, string> = { "\t": "tabbar", ";": "semikolon", ",": "komma" };

type Summary = Extract<PieceImportResult, { kind: "imported" }>["summary"];

/**
 * Piece import on Alla noter: paste rows, check the preview, confirm. The
 * paste stays at the top, so going back to fix it is scrolling up to it.
 * Nothing is written until the user confirms.
 */
export function PieceImportPanel({
  groupSlug,
  group: initialGroup,
  onClose,
}: {
  groupSlug: string;
  group: ImportGroup;
  onClose: () => void;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [choices, setChoices] = useState<ImportChoices>(NO_IMPORT_CHOICES);
  const [group, setGroup] = useState(initialGroup);
  const [error, setError] = useState<string | null>(null);
  const [groupChanged, setGroupChanged] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isSaving, startSaving] = useTransition();

  const plan = useMemo(() => buildImportPlan(text, group, choices), [text, group, choices]);
  const preview = plan.kind === "preview" ? plan : null;

  function changeText(next: string) {
    setText(next);
    setChoices(NO_IMPORT_CHOICES);
    setError(null);
    setGroupChanged(false);
  }

  function changeColumn(index: number, use: boolean) {
    setChoices((current) => ({ ...current, columns: { ...current.columns, [index]: use } }));
  }

  function changeDuplicate(line: number, add: boolean) {
    setChoices((current) => ({
      ...current,
      addDuplicateLines: add
        ? [...current.addDuplicateLines, line]
        : current.addDuplicateLines.filter((l) => l !== line),
    }));
  }

  function backToText() {
    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    textareaRef.current?.focus();
  }

  function confirm() {
    if (!preview) return;
    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("text", text);
    formData.set("choices", JSON.stringify(choices));
    formData.set("outcome", importOutcome(preview));
    startSaving(async () => {
      try {
        const result = await importPieces(formData);
        setError(null);
        if (result.kind === "changed") {
          setGroup(result.group);
          setGroupChanged(true);
        } else {
          setSummary(result.summary);
          router.refresh();
        }
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte importera noterna"));
      }
    });
  }

  if (summary) {
    return <ImportSummary summary={summary} onClose={onClose} />;
  }

  return (
    <section aria-labelledby="piece-import-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="piece-import-heading" className="text-lg font-semibold">
          Importera noter
        </h2>
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Avbryt
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_16rem]">
        <div className="space-y-1">
          <Label htmlFor="piece-import-text">Rader från kalkylarket</Label>
          <Textarea
            id="piece-import-text"
            ref={textareaRef}
            value={text}
            onChange={(event) => changeText(event.target.value)}
            placeholder="Klistra in rader från kalkylarket här, med rubrikraden först"
            className="h-36 font-mono text-xs"
            autoFocus
            disabled={isSaving}
          />
        </div>
        <aside className="space-y-1 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <p>Första raden är rubriker. Första kolumnen är titeln.</p>
          <p>Varje annan kolumn är en roll, med personerna i varje cell skilda av semikolon (;).</p>
          <p>Högst {MAX_IMPORT_ROWS} rader.</p>
          {preview ? <p>Avgränsat med {DELIMITER_LABELS[preview.delimiter]}.</p> : null}
        </aside>
      </div>

      {plan.kind === "tooMany" ? (
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          Texten har {plan.rowCount} rader, men högst {MAX_IMPORT_ROWS} kan importeras åt gången. Inget
          importeras.
        </p>
      ) : null}

      {preview ? (
        <>
          {groupChanged ? (
            <p role="status" className="rounded-md border border-amber-500 p-3 text-sm">
              Gruppen har ändrats sedan förhandsvisningen. Inget sparades. Kontrollera förhandsvisningen
              och importera igen.
            </p>
          ) : null}
          <PieceImportPreview
            preview={preview}
            onColumnChange={changeColumn}
            onDuplicateChange={changeDuplicate}
          />
          <div className="sticky bottom-4 z-10 mx-auto flex w-fit max-w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm">
              <strong>{preview.counts.pieces}</strong> noter · <strong>{preview.counts.newPeople}</strong>{" "}
              nya personer · <strong>{preview.counts.skipped}</strong> hoppas över
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={backToText} disabled={isSaving}>
                Tillbaka
              </Button>
              <Button onClick={confirm} disabled={isSaving || preview.counts.pieces === 0}>
                {isSaving ? "Importerar…" : "Importera"}
              </Button>
            </div>
            {error ? (
              <p role="alert" className="basis-full text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ImportSummary({ summary, onClose }: { summary: Summary; onClose: () => void }) {
  return (
    <section aria-labelledby="piece-import-summary-heading" className="max-w-xl space-y-4 rounded-lg border p-4">
      <h2 id="piece-import-summary-heading" className="text-lg font-semibold">
        Import klar
      </h2>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <SummaryStat label="Noter tillagda" value={summary.pieces} />
        <SummaryStat label="Noter överhoppade" value={summary.skipped} />
        <SummaryStat label="Personer skapade" value={summary.newPeople} />
        <SummaryStat
          label="Nya roller i gruppen"
          value={summary.newCreditRoles.length}
          detail={summary.newCreditRoles.join(", ")}
        />
      </dl>
      <Button onClick={onClose}>Tillbaka till noterna</Button>
    </section>
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

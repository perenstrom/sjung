"use client";

// PROTOTYPE (PER-434) — Variant A: "Dialog i steg".
// A wide dialog: paste → preview (piece list) → summary. Column choices are a
// chip row above the list; duplicates sit inline; unreadable rows fold away.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_ROWS } from "./parse";
import { delimiterLabel, NewMark, SummaryView, type ImportState } from "./shared";

export function VariantA({ state, open, onOpenChange }: { state: ImportState; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [step, setStep] = useState<"paste" | "preview">("paste");
  const p = state.preview;

  function close(o: boolean) {
    onOpenChange(o);
    if (!o) {
      state.reset();
      setStep("paste");
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-3xl">
        {state.summary ? (
          <>
            <DialogHeader>
              <DialogTitle>Import klar</DialogTitle>
            </DialogHeader>
            <SummaryView summary={state.summary} />
            <DialogFooter>
              <Button onClick={() => close(false)}>Stäng</Button>
            </DialogFooter>
          </>
        ) : step === "paste" ? (
          <>
            <DialogHeader>
              <DialogTitle>Importera noter</DialogTitle>
              <DialogDescription>
                Klistra in rader från ett kalkylark. Första raden är rubriker, första kolumnen är titeln och varje
                annan kolumn är en roll. Flera personer i en cell skiljs med <code>;</code>.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={state.text}
              onChange={(e) => state.setText(e.target.value)}
              placeholder={"Titel\tKompositör\tTextförfattare\nUti vår hage\tHugo Alfvén\t"}
              className="min-h-72 font-mono text-xs"
              autoFocus
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button type="button" className="underline" onClick={state.fillExample}>
                Fyll i exempel (prototyp)
              </button>
              <span>Högst {MAX_ROWS} rader</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                Avbryt
              </Button>
              <Button disabled={!p || p.tooMany !== null} onClick={() => setStep("preview")}>
                Förhandsgranska
              </Button>
            </DialogFooter>
            {p?.tooMany ? (
              <p className="text-sm text-destructive">
                {p.tooMany} rader är för många. Dela upp importen i delar om högst {MAX_ROWS} rader.
              </p>
            ) : null}
          </>
        ) : p ? (
          <>
            <DialogHeader>
              <DialogTitle>Förhandsgranska import</DialogTitle>
              <DialogDescription>
                {p.rows.filter((r) => r.add).length} noter läggs till · {p.newPeople.length} nya personer ·{" "}
                {p.newRoles.length} nya roller · avgränsat med {delimiterLabel[p.delimiter]}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Kolumner som blir roller</p>
              <div className="flex flex-wrap gap-1.5">
                {p.columns.map((c) => (
                  <button
                    key={c.index}
                    type="button"
                    onClick={() => state.toggleColumn(c.index, !c.use)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs",
                      c.use ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground line-through"
                    )}
                    title={c.use ? "Klicka för att ignorera" : "Klicka för att använda som roll"}
                  >
                    {c.use ? "✓ " : ""}
                    {c.header}
                    {c.use && !c.roleIsKnown ? " (ny roll)" : ""}
                  </button>
                ))}
              </div>
            </div>

            <ul className="-mx-6 max-h-[45vh] divide-y overflow-y-auto border-y px-6">
              {p.rows.map((r) => (
                <li key={r.line} className={cn("py-2", !r.add && "opacity-50")}>
                  <div className="flex items-start gap-2">
                    <span className="flex-1 font-medium">{r.title}</span>
                    {r.duplicate ? (
                      <label className="flex shrink-0 items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                        {r.duplicate === "existing" ? "Finns redan" : "Finns tidigare i listan"}
                        <select
                          className="rounded border bg-background px-1 py-0.5 text-foreground"
                          value={r.add ? "add" : "skip"}
                          onChange={(e) => state.toggleDuplicate(r.line, e.target.value === "add")}
                        >
                          <option value="skip">Hoppa över</option>
                          <option value="add">Lägg till ändå</option>
                        </select>
                      </label>
                    ) : null}
                  </div>
                  {r.credits.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {r.credits.map((c, i) => (
                        <span key={c.person.name}>
                          {i > 0 ? " · " : ""}
                          <span className="text-foreground">{c.person.name}</span>
                          <NewMark isNew={c.person.isNew} className="ml-1" /> ({c.roles.map((x) => x.role).join(", ")})
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Inga medverkande</p>
                  )}
                </li>
              ))}
            </ul>

            {p.skipped.length > 0 ? (
              <details className="rounded-md border border-destructive/40 p-2 text-sm">
                <summary className="cursor-pointer text-destructive">
                  {p.skipped.length} rader kunde inte läsas och hoppas över
                </summary>
                <ul className="mt-2 space-y-1">
                  {p.skipped.map((s) => (
                    <li key={s.line}>
                      Rad {s.line}: {s.reason}
                      <code className="ml-2 block truncate text-xs text-muted-foreground">{s.raw}</code>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("paste")}>
                Tillbaka
              </Button>
              <Button onClick={state.confirm}>Importera {p.rows.filter((r) => r.add).length} noter</Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

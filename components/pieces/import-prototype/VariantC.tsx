"use client";

// PROTOTYPE (PER-434) — Variant C: "Granska per typ".
// A tall side panel and a three-step wizard: 1 Klistra in, 2 Kolumner (one
// card per column with sample values), 3 Granska — tabs per kind of thing
// that will be created: Noter, Personer, Roller, Att åtgärda. Built around
// "what will this create?" rather than "what did I paste?", so a typo Person
// like "anders aström" shows up as its own new Person.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_ROWS } from "./parse";
import { delimiterLabel, NewMark, SummaryView, type ImportState } from "./shared";

const STEPS = ["Klistra in", "Kolumner", "Granska"] as const;
type Tab = "pieces" | "people" | "roles" | "issues";

export function VariantC({ state, open, onOpenChange }: { state: ImportState; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState<Tab>("pieces");
  const p = state.preview;

  function close(o: boolean) {
    onOpenChange(o);
    if (!o) {
      state.reset();
      setStep(0);
      setTab("pieces");
    }
  }

  const adding = p?.rows.filter((r) => r.add) ?? [];
  const duplicates = p?.rows.filter((r) => r.duplicate) ?? [];
  const issueCount = duplicates.length + (p?.skipped.length ?? 0);

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-2xl">
        <SheetHeader className="border-b">
          <SheetTitle>Importera noter</SheetTitle>
          {state.summary ? null : (
            <ol className="mt-2 flex gap-1 text-xs">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  className={cn(
                    "flex-1 rounded-sm border-b-2 pb-1",
                    i === step ? "border-primary font-semibold" : i < step ? "border-primary/40" : "border-muted text-muted-foreground"
                  )}
                >
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
          )}
          <SheetDescription className="sr-only">Importera noter från kalkylark</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {state.summary ? (
            <SummaryView summary={state.summary} />
          ) : step === 0 ? (
            <div className="space-y-3">
              <Textarea
                value={state.text}
                onChange={(e) => state.setText(e.target.value)}
                className="h-[50vh] font-mono text-xs"
                placeholder="Klistra in här"
                autoFocus
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <button type="button" className="underline" onClick={state.fillExample}>
                  Fyll i exempel (prototyp)
                </button>
                <span>
                  {p ? `${p.rows.length + p.skipped.length} rader · ${delimiterLabel[p.delimiter]}` : `Högst ${MAX_ROWS} rader`}
                </span>
              </div>
              {p?.tooMany ? (
                <p className="text-sm text-destructive">
                  {p.tooMany} rader är för många — högst {MAX_ROWS}.
                </p>
              ) : null}
            </div>
          ) : step === 1 && p ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Kolumnen <strong>{"Titel"}</strong> blir notens namn. Välj vad de andra kolumnerna är.
              </p>
              {p.columns.map((c) => (
                <div key={c.index} className={cn("rounded-md border p-3", !c.use && "bg-muted/50")}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{c.header}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        t.ex. {c.sample.length ? c.sample.join(" · ") : "(tom)"}
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" checked={c.use} onChange={() => state.toggleColumn(c.index, true)} />
                      Roll
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" checked={!c.use} onChange={() => state.toggleColumn(c.index, false)} />
                      Ignorera
                    </label>
                  </div>
                  {c.use && !c.roleIsKnown ? (
                    <p className="mt-1 text-xs text-sky-700 dark:text-sky-300">“{c.role}” blir en ny roll i gruppen.</p>
                  ) : null}
                  {!c.use && c.defaultUse === false ? (
                    <p className="mt-1 text-xs text-muted-foreground">Ingen roll som gruppen använder — ignoreras som standard.</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : p ? (
            <div className="space-y-3">
              <div className="flex gap-1 border-b text-sm">
                {(
                  [
                    ["pieces", `Noter ${adding.length}`],
                    ["people", `Personer ${p.newPeople.length} nya`],
                    ["roles", `Roller ${p.newRoles.length} nya`],
                    ["issues", `Att åtgärda ${issueCount}`],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={cn(
                      "-mb-px border-b-2 px-3 py-1.5",
                      tab === k ? "border-primary font-medium" : "border-transparent text-muted-foreground",
                      k === "issues" && issueCount > 0 && "text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "pieces" ? (
                <ul className="divide-y">
                  {adding.map((r) => (
                    <li key={r.line} className="py-1.5 text-sm">
                      <span className="font-medium">{r.title}</span>
                      <span className="text-muted-foreground">
                        {r.credits.length ? " — " + r.credits.map((c) => c.person.name).join(", ") : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : tab === "people" ? (
                <div className="space-y-4">
                  <PeopleList title="Skapas" people={p.newPeople} isNew />
                  <PeopleList title="Finns redan i gruppen" people={p.existingPeople} isNew={false} />
                </div>
              ) : tab === "roles" ? (
                <ul className="space-y-1 text-sm">
                  {p.existingRolesUsed.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                  {p.newRoles.map((r) => (
                    <li key={r}>
                      {r} <NewMark isNew />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-4">
                  {duplicates.length ? (
                    <section>
                      <h3 className="mb-1 text-sm font-semibold">Titeln finns redan</h3>
                      <ul className="divide-y rounded-md border">
                        {duplicates.map((r) => (
                          <li key={r.line} className="flex items-center gap-2 px-3 py-2 text-sm">
                            <span className="flex-1">
                              {r.title}
                              <span className="block text-xs text-muted-foreground">
                                Rad {r.line} · {r.duplicate === "existing" ? "finns i gruppen" : "finns tidigare i inklistringen"}
                              </span>
                            </span>
                            <Button size="sm" variant={r.add ? "outline" : "secondary"} onClick={() => state.toggleDuplicate(r.line, false)}>
                              Hoppa över
                            </Button>
                            <Button size="sm" variant={r.add ? "secondary" : "outline"} onClick={() => state.toggleDuplicate(r.line, true)}>
                              Lägg till
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {p.skipped.length ? (
                    <section>
                      <h3 className="mb-1 text-sm font-semibold">Kan inte läsas — hoppas över</h3>
                      <ul className="divide-y rounded-md border border-destructive/40">
                        {p.skipped.map((s) => (
                          <li key={s.line} className="px-3 py-2 text-sm">
                            Rad {s.line}: {s.reason}
                            <code className="block truncate text-xs text-muted-foreground">{s.raw}</code>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {issueCount === 0 ? <p className="text-sm text-muted-foreground">Inget att åtgärda.</p> : null}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex justify-between gap-2 border-t p-4">
          {state.summary ? (
            <Button className="ml-auto" onClick={() => close(false)}>
              Stäng
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => (step === 0 ? close(false) : setStep(step - 1))}>
                {step === 0 ? "Avbryt" : "Tillbaka"}
              </Button>
              {step < 2 ? (
                <Button disabled={!p || p.tooMany !== null} onClick={() => setStep(step + 1)}>
                  Nästa
                </Button>
              ) : (
                <Button onClick={state.confirm}>Importera {adding.length} noter</Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PeopleList({ title, people, isNew }: { title: string; people: { name: string; pieces: string[] }[]; isNew: boolean }) {
  if (people.length === 0) return null;
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold">
        {title} ({people.length})
      </h3>
      <ul className="divide-y rounded-md border">
        {people
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, "sv"))
          .map((person) => (
            <li key={person.name} className="px-3 py-1.5 text-sm">
              {person.name} <NewMark isNew={isNew} />
              <span className="block truncate text-xs text-muted-foreground">{person.pieces.join(", ")}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}

"use client";

// PROTOTYPE (PER-434) — Variant B: "Kalkylark på sidan".
// No dialog. The import takes over the page below the header: the paste box on
// top, and a live grid that mirrors the pasted columns underneath. Each column
// header carries its own Roll/Ignorera switch; each row carries its own status.
// "Tillbaka" is just scrolling up — the text is always there.
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_ROWS, type ImportRow } from "./parse";
import { delimiterLabel, SummaryView, type ImportState } from "./shared";

export function VariantB({ state, onClose }: { state: ImportState; onClose: () => void }) {
  const p = state.preview;
  const adding = p?.rows.filter((r) => r.add).length ?? 0;

  if (state.summary) {
    return (
      <section className="max-w-xl space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Import klar</h2>
        <SummaryView summary={state.summary} />
        <Button
          onClick={() => {
            state.reset();
            onClose();
          }}
        >
          Tillbaka till noterna
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Importera noter</h2>
        <Button
          variant="ghost"
          onClick={() => {
            state.reset();
            onClose();
          }}
        >
          Avbryt
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_16rem]">
        <Textarea
          value={state.text}
          onChange={(e) => state.setText(e.target.value)}
          placeholder="Klistra in rader från kalkylarket här, med rubrikraden först"
          className="h-36 font-mono text-xs"
          autoFocus
        />
        <aside className="space-y-1 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <p>Första kolumnen är titeln. Varje annan kolumn är en roll, med personer skilda av ;</p>
          {p ? <p>Avgränsat med {delimiterLabel[p.delimiter]}.</p> : null}
          <button type="button" className="underline" onClick={state.fillExample}>
            Fyll i exempel (prototyp)
          </button>
        </aside>
      </div>

      {p?.tooMany ? (
        <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
          {p.tooMany} rader är för många — högst {MAX_ROWS}. Inget kommer att importeras.
        </p>
      ) : null}

      {p && !p.tooMany ? (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/60 align-top">
                <tr>
                  <th className="w-8 border-r px-2 py-2 text-left text-xs font-normal text-muted-foreground">#</th>
                  <th className="min-w-48 border-r px-2 py-2 text-left">
                    <div>Titel</div>
                    <div className="text-xs font-normal text-muted-foreground">Första kolumnen</div>
                  </th>
                  {p.columns.map((c) => (
                    <th key={c.index} className={cn("min-w-40 border-r px-2 py-2 text-left", !c.use && "bg-muted")}>
                      <div className={cn(!c.use && "text-muted-foreground line-through")}>{c.header}</div>
                      <div className="mt-1 inline-flex overflow-hidden rounded border text-xs font-normal">
                        <button
                          type="button"
                          onClick={() => state.toggleColumn(c.index, true)}
                          className={cn("px-1.5 py-0.5", c.use && "bg-primary text-primary-foreground")}
                        >
                          Roll
                        </button>
                        <button
                          type="button"
                          onClick={() => state.toggleColumn(c.index, false)}
                          className={cn("px-1.5 py-0.5", !c.use && "bg-foreground text-background")}
                        >
                          Ignorera
                        </button>
                      </div>
                      {c.use ? (
                        <div className="mt-1 text-[11px] font-normal text-muted-foreground">
                          {c.roleIsKnown ? `Befintlig roll: ${c.role}` : "Ny roll i gruppen"}
                        </div>
                      ) : null}
                    </th>
                  ))}
                  <th className="min-w-36 px-2 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {mergeRows(p.rows, p.skipped).map((item) =>
                  item.kind === "row" ? (
                    <GridRow key={item.row.line} row={item.row} columns={p.columns} state={state} />
                  ) : (
                    <tr key={item.line} className="bg-destructive/5">
                      <td className="border-t border-r px-2 py-1.5 text-xs text-muted-foreground tabular-nums">{item.line}</td>
                      <td colSpan={p.columns.length + 1} className="border-t border-r px-2 py-1.5 font-mono text-xs text-muted-foreground">
                        <span className="block truncate">{item.raw}</span>
                      </td>
                      <td className="border-t px-2 py-1.5 text-xs text-destructive">Hoppas över: {item.reason}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              <Legend isNew={false} /> finns i gruppen
            </span>
            <span>
              <Legend isNew /> skapas vid import
            </span>
          </p>

          <div className="fixed inset-x-0 bottom-16 z-40 mx-auto flex w-fit items-center gap-4 rounded-lg border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm">
              <strong>{adding}</strong> noter · <strong>{p.newPeople.length}</strong> nya personer ·{" "}
              <strong>{p.skipped.length + p.rows.length - adding}</strong> hoppas över
            </span>
            <Button onClick={state.confirm} disabled={adding === 0}>
              Importera
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function GridRow({ row, columns, state }: { row: ImportRow; columns: NonNullable<ImportState["preview"]>["columns"]; state: ImportState }) {
  return (
    <tr className={cn(!row.add && "opacity-50")}>
      <td className="border-t border-r px-2 py-1.5 text-xs text-muted-foreground tabular-nums">{row.line}</td>
      <td className="border-t border-r px-2 py-1.5 font-medium">{row.title}</td>
      {columns.map((c) => {
        const raw = (row.rawCells[c.index] ?? "").trim();
        if (!c.use) {
          return (
            <td key={c.index} className="border-t border-r bg-muted px-2 py-1.5 text-xs text-muted-foreground">
              {raw}
            </td>
          );
        }
        const names = raw.split(";").map((n) => n.trim()).filter(Boolean);
        return (
          <td key={c.index} className="border-t border-r px-2 py-1.5">
            <div className="flex flex-wrap gap-1">
              {names.map((n) => {
                const credit = row.credits.find((cr) => cr.person.name.toLocaleLowerCase("sv") === n.replace(/\s+/g, " ").toLocaleLowerCase("sv"));
                const isNew = credit?.person.isNew ?? true;
                return (
                  <span
                    key={n}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs",
                      isNew
                        ? "border border-dashed border-sky-500 text-sky-800 dark:text-sky-200"
                        : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
                    )}
                    title={isNew ? "Ny person" : `Befintlig: ${credit?.person.name}`}
                  >
                    {credit?.person.name ?? n}
                  </span>
                );
              })}
            </div>
          </td>
        );
      })}
      <td className="border-t px-2 py-1.5 text-xs">
        {row.duplicate ? (
          <div className="space-y-1">
            <div className="text-amber-700 dark:text-amber-400">
              {row.duplicate === "existing" ? "Titeln finns redan" : "Dubblett av tidigare rad"}
            </div>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={row.add} onChange={(e) => state.toggleDuplicate(row.line, e.target.checked)} />
              Lägg till ändå
            </label>
          </div>
        ) : (
          <span className="text-emerald-700 dark:text-emerald-400">Läggs till</span>
        )}
      </td>
    </tr>
  );
}

function Legend({ isNew }: { isNew: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-3 w-5 rounded-sm align-middle",
        isNew ? "border border-dashed border-sky-500" : "bg-emerald-100 dark:bg-emerald-900"
      )}
    />
  );
}

type Merged = { kind: "row"; row: ImportRow } | { kind: "skipped"; line: number; reason: string; raw: string };

function mergeRows(rows: ImportRow[], skipped: { line: number; reason: string; raw: string }[]): Merged[] {
  return [
    ...rows.map((row) => ({ kind: "row" as const, row, line: row.line })),
    ...skipped.map((s) => ({ kind: "skipped" as const, ...s })),
  ].sort((a, b) => a.line - b.line);
}

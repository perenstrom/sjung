import { Checkbox } from "@/components/ui/checkbox";
import type { ImportColumn, ImportPerson, ImportPreview, ImportRow, SkippedImportRow } from "@/lib/pieces/import";
import { cn } from "@/lib/utils";

/**
 * The Piece import preview: a grid mirroring the pasted columns, with a
 * Credit role / Ignore switch per column, the People in each cell marked
 * existing or new, and a status per row. Rows that can't be read stay in
 * place with their reason.
 */
export function PieceImportPreview({
  preview,
  onColumnChange,
  onDuplicateChange,
}: {
  preview: ImportPreview;
  onColumnChange: (index: number, use: boolean) => void;
  onDuplicateChange: (line: number, add: boolean) => void;
}) {
  const lines: ({ kind: "row"; row: ImportRow } | { kind: "skipped"; row: SkippedImportRow })[] = [
    ...preview.rows.map((row) => ({ kind: "row" as const, row })),
    ...preview.skipped.map((row) => ({ kind: "skipped" as const, row })),
  ].sort((a, b) => a.row.line - b.row.line);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/60 align-top">
            <tr>
              <th scope="col" className="w-8 border-r px-2 py-2 text-left text-xs font-normal text-muted-foreground">
                Rad
              </th>
              <th scope="col" className="min-w-48 border-r px-2 py-2 text-left">
                <div>Titel</div>
                <div className="text-xs font-normal text-muted-foreground">Första kolumnen</div>
              </th>
              {preview.columns.map((column) => (
                <ColumnHeader key={column.index} column={column} onChange={onColumnChange} />
              ))}
              <th scope="col" className="min-w-36 px-2 py-2 text-left">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) =>
              line.kind === "row" ? (
                <PreviewRow key={line.row.line} row={line.row} onDuplicateChange={onDuplicateChange} />
              ) : (
                <tr key={line.row.line} className="bg-destructive/5">
                  <LineCell line={line.row.line} />
                  <td
                    colSpan={preview.columns.length + 1}
                    className="max-w-0 border-t border-r px-2 py-1.5 font-mono text-xs text-muted-foreground"
                  >
                    <span className="block truncate">{line.row.raw}</span>
                  </td>
                  <td className="border-t px-2 py-1.5 text-xs text-destructive">
                    Hoppas över: {line.row.reason}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <PersonChip person={{ kind: "existing", id: "", name: "Namn" }} /> finns i gruppen
        </span>
        <span className="flex items-center gap-1">
          <PersonChip person={{ kind: "new", name: "Namn" }} /> skapas vid import
        </span>
      </p>
    </div>
  );
}

function ColumnHeader({
  column,
  onChange,
}: {
  column: ImportColumn;
  onChange: (index: number, use: boolean) => void;
}) {
  return (
    <th scope="col" className={cn("min-w-40 border-r px-2 py-2 text-left", !column.use && "bg-muted")}>
      <div className={cn("break-words", !column.use && "text-muted-foreground line-through")}>
        {column.header || "(ingen rubrik)"}
      </div>
      {column.unusableReason ? (
        <div className="mt-1 text-xs font-normal text-destructive">{column.unusableReason}</div>
      ) : (
        <>
          <div
            role="group"
            aria-label={`Kolumnen ${column.header}`}
            className="mt-1 inline-flex overflow-hidden rounded border text-xs font-normal"
          >
            <button
              type="button"
              aria-pressed={column.use}
              onClick={() => onChange(column.index, true)}
              className={cn("px-1.5 py-0.5", column.use && "bg-primary text-primary-foreground")}
            >
              Roll
            </button>
            <button
              type="button"
              aria-pressed={!column.use}
              onClick={() => onChange(column.index, false)}
              className={cn("px-1.5 py-0.5", !column.use && "bg-foreground text-background")}
            >
              Ignorera
            </button>
          </div>
          {column.use ? (
            <div className="mt-1 text-[11px] font-normal text-muted-foreground">
              {column.isNewToGroup ? "Ny roll i gruppen" : `Befintlig roll: ${column.role}`}
            </div>
          ) : null}
        </>
      )}
    </th>
  );
}

function PreviewRow({
  row,
  onDuplicateChange,
}: {
  row: ImportRow;
  onDuplicateChange: (line: number, add: boolean) => void;
}) {
  const checkboxId = `import-add-${row.line}`;
  return (
    <tr className={cn(!row.add && "opacity-60")}>
      <LineCell line={row.line} />
      <td className="border-t border-r px-2 py-1.5 font-medium">{row.title}</td>
      {row.cells.map((cell, i) =>
        cell.kind === "ignored" ? (
          <td key={i} className="border-t border-r bg-muted px-2 py-1.5 text-xs text-muted-foreground">
            {cell.text}
          </td>
        ) : (
          <td key={i} className="border-t border-r px-2 py-1.5">
            <div className="flex flex-wrap gap-1">
              {cell.people.map((person) => (
                <PersonChip key={person.name} person={person} />
              ))}
            </div>
          </td>
        )
      )}
      <td className="border-t px-2 py-1.5 text-xs">
        {row.duplicate ? (
          <div className="space-y-1">
            <div className="text-amber-700 dark:text-amber-400">
              {row.duplicate === "existing" ? "Titeln finns redan" : "Dubblett av tidigare rad"}
            </div>
            <label htmlFor={checkboxId} className="flex items-center gap-1.5">
              <Checkbox
                id={checkboxId}
                checked={row.add}
                onCheckedChange={(checked) => onDuplicateChange(row.line, checked === true)}
              />
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

function LineCell({ line }: { line: number }) {
  return <td className="border-t border-r px-2 py-1.5 text-xs text-muted-foreground tabular-nums">{line}</td>;
}

function PersonChip({ person }: { person: ImportPerson }) {
  const isNew = person.kind === "new";
  return (
    <span
      title={isNew ? "Ny person" : "Finns i gruppen"}
      className={cn(
        "rounded px-1.5 py-0.5 text-xs",
        isNew
          ? "border border-dashed border-sky-500 text-sky-800 dark:text-sky-200"
          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
      )}
    >
      {person.name}
    </span>
  );
}

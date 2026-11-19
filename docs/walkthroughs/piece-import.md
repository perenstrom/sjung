# Piece import: a linear walkthrough

*2026-11-18T12:45:34Z by Showboat 0.6.1*
<!-- showboat-id: 2a92aab0-d30d-4a02-b0b2-445a88ac5238 -->

This document walks through **Piece import** (PER-434): pasting rows from a spreadsheet on *Alla noter* and getting Pieces, new People and their Credits out of it. It follows the code in the order the feature runs: the page loads what the import matches against, the client builds a preview as the user types, and the server rebuilds the same plan inside a transaction before saving.

Every code excerpt is pulled live from the repository with `sed`, `grep` or `cat`, and several sections run the real `lib/pieces/import.ts` through `tsx` so you can see what it returns for a given paste. Source excerpts are fenced as `tsx` for syntax highlighting, so `showboat verify` no longer works on this file; re-run the `bash` block above an excerpt to check it against the current code.

For an animated, step-by-step run of `buildImportPlan` on the example paste from section 9, open [piece-import.html](piece-import.html) in a browser.

The order is:

1. The files involved, and the one idea behind the design
2. The matching rules everything leans on: `normalizeSpacing`, `matchKey`, `resolveCreditRole`
3. Where it starts: the page, `getPieceImportGroup` and the panel switch
4. The engine's vocabulary: the types in `lib/pieces/import.ts`
5. Reading the paste: `detectDelimiter`
6. Splitting records: `readRecords` and `readQuoted`
7. Columns: which headers become Credit roles (`readColumns`)
8. Rows that can't be read: `rowProblem`
9. The heart: `buildImportPlan`
10. Detecting a stale preview: `importOutcome`
11. The client: `PieceImportPanel` and `PieceImportPreview`
12. The server: parsing the form, `importPieces` and `saveImport`
13. How it is tested

## 1. The files involved, and the one idea behind the design

The feature spans one pure module, one server action, a query, a form-data schema and two client components:

```bash
wc -l lib/pieces/import.ts lib/pieces/queries.ts lib/schemas/pieces.ts app/actions/pieces.ts \
  'app/app/[groupSlug]/pieces/page.tsx' components/pieces/PiecesPageContent.tsx \
  components/pieces/import/PieceImportPanel.tsx components/pieces/import/PieceImportPreview.tsx

```

```output
     351 lib/pieces/import.ts
      95 lib/pieces/queries.ts
     227 lib/schemas/pieces.ts
     406 app/actions/pieces.ts
      49 app/app/[groupSlug]/pieces/page.tsx
      62 components/pieces/PiecesPageContent.tsx
     213 components/pieces/import/PieceImportPanel.tsx
     198 components/pieces/import/PieceImportPreview.tsx
    1601 total
```

The one idea to hold on to: **`buildImportPlan` is a pure function that runs twice.** The browser runs it on every keystroke to draw the preview, against a snapshot of the Group (its People, Credit roles in use and Piece titles) that the page loaded. When the user confirms, the browser posts the *raw text and choices* — not the computed plan — plus a fingerprint of the outcome it showed. The server loads the Group fresh inside a serializable transaction, runs the very same function, and only saves if its fingerprint matches. If someone added a Person or Piece in the meantime, the server saves nothing and sends back the current Group so the preview can redraw.

The module's header comment says the same thing:

```bash
sed -n '8,18p' lib/pieces/import.ts

```

```tsx
/**
 * Piece import: Pieces with their Credits from rows pasted from a
 * spreadsheet. `buildImportPlan` reads the paste and matches it against the
 * Group. The client shows its preview, and the confirming server action runs
 * it again against the Group as it is then, so it can tell whether the
 * preview went stale (`importOutcome`) before saving.
 *
 * Walked through in docs/walkthroughs/piece-import.md (excerpts quoted by line
 * number) and animated in docs/walkthroughs/piece-import.html. Update both
 * when this file's behaviour changes.
 */
```

## 2. The matching rules everything leans on

Import never compares names with `===`. Two names are "the same" when they differ only in letter case or spacing, and that rule lives in `lib/text/match-key.ts`:

```bash
cat lib/text/match-key.ts

```

```tsx
/** Trimmed, with each run of whitespace collapsed to one space. */
export function normalizeSpacing(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * What two names compare by when they are the same if they differ only in
 * letter case or spacing. Accents count: "Åström" and "Aström" differ.
 */
export function matchKey(text: string): string {
  return normalizeSpacing(text).toLocaleLowerCase("sv");
}
```

`normalizeSpacing` is the *display/storage* form (what gets written), and `matchKey` is the *comparison* form (what gets looked up). Note the Swedish locale and that accents still count:

```bash
npx --yes tsx@4.23.15 -e '
import { matchKey, normalizeSpacing } from "@/lib/text/match-key";
console.log(JSON.stringify(normalizeSpacing("  Anna   Berg ")));
console.log(matchKey("ANNA  berg") === matchKey("Anna Berg"));
console.log(matchKey("Åström") === matchKey("Aström"));
'

```

```output
"Anna Berg"
true
false
```

Credit roles are free text, with three built-in ones. When a typed role matches a built-in role or one the Group already uses, `resolveCreditRole` returns the *existing spelling*, so a header `KOMPOSITÖR` stores as `Kompositör` instead of creating a near-duplicate role:

```bash
sed -n '9,11p;37,48p' lib/pieces/credit-roles.ts

```

```tsx
export const BUILT_IN_CREDIT_ROLES: readonly string[] = ["Arrangör", "Kompositör", "Textförfattare"];

export const MAX_CREDIT_ROLE_LENGTH = 50;
/**
 * The role to store for a typed one: the existing spelling when it matches a
 * built-in role or one already on the Group's credits, else the typed text
 * normalized.
 */
export function resolveCreditRole(typed: string, groupRoles: readonly string[]): string {
  const key = matchKey(typed);
  return (
    rankCreditRoles(groupRoles).find((role) => matchKey(role) === key) ??
    normalizeSpacing(typed)
  );
}
```

## 3. Where it starts: the page, `getPieceImportGroup` and the panel switch

*Alla noter* is a server component. Next to the Pieces, People and Credit roles it already loads, it loads the `ImportGroup` — but only for Members allowed to change content; everyone else gets an empty one, since they never see the Importera button:

```bash
sed -n '15,26p' 'app/app/[groupSlug]/pieces/page.tsx'

```

```tsx
export default async function GroupPiecesPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const access = await findGroupAccess(groupSlug);
  const canEdit = access?.can("manageContent") ?? false;
  const [pieces, people, creditRoles, groups, importGroup] = await Promise.all([
    getPieces(groupSlug),
    getPeople(groupSlug),
    getCreditRoles(groupSlug),
    getGroups(),
    // Only Members who can change content can import.
    canEdit ? getPieceImportGroup(groupSlug) : EMPTY_IMPORT_GROUP,
  ]);
```

`getPieceImportGroup` is a thin server action: it resolves the slug to a Group the user can write to, then delegates to the query.

```bash
sed -n '71,75p' app/actions/pieces.ts

```

```tsx
/** What a Piece import in the Group matches against, for its preview. */
export async function getPieceImportGroup(groupSlug: string): Promise<ImportGroup> {
  const { groupId } = await getWritableGroupIdForSlug(parseWritableGroupSlugParam(groupSlug));
  return getPieceImportGroupFor(groupId);
}
```

The query reads the three things the import matches against. Notice the optional `db` parameter: it defaults to the global Prisma client, but the confirming action will pass its transaction client `tx`, so the *same* query runs inside the serializable transaction later on (section 12). People are ordered by name and then id, so if a Group has two People whose names share a `matchKey`, the import consistently picks the same one.

```bash
sed -n '67,95p' lib/pieces/queries.ts

```

```tsx
/** The distinct Credit roles on the Group's credits, as stored. */
export async function getCreditRolesUsedInGroup(
  groupId: string,
  db: Pick<typeof prisma, "personToPiece"> = prisma
): Promise<string[]> {
  const credits = await db.personToPiece.findMany({
    where: { piece: { groupId } },
    distinct: ["role"],
    select: { role: true },
  });
  return credits.map((credit) => credit.role);
}

/** What a Piece import matches against: the Group's People, Credit roles in use and Piece titles. */
export async function getPieceImportGroupFor(
  groupId: string,
  db: Pick<typeof prisma, "person" | "personToPiece" | "piece"> = prisma
): Promise<ImportGroup> {
  const [people, creditRoles, pieces] = await Promise.all([
    db.person.findMany({
      where: { groupId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
    getCreditRolesUsedInGroup(groupId, db),
    db.piece.findMany({ where: { groupId }, select: { name: true } }),
  ]);
  return { people, creditRoles, pieceTitles: pieces.map((piece) => piece.name) };
}
```

On the client, `PiecesPageContent` owns one bit of state, `isImportOpen`. While the page is in Edit mode and the import is open, the `PieceImportPanel` takes the Pieces table's place; leaving Edit mode hides it again without losing the flag.

```bash
sed -n '32,61p' components/pieces/PiecesPageContent.tsx

```

```tsx
  const { isEditing } = useEditMode();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const importing = isEditing && isImportOpen;

  return (
    <>
      <PageHeader
        title="Alla noter"
        editActions={
          <>
            <Button variant="outline" onClick={() => setIsImportOpen(true)} disabled={importing}>
              Importera
            </Button>
            <CreatePieceDialog people={people} creditRoles={creditRoles} groupSlug={groupSlug} />
          </>
        }
      />

      {importing ? (
        <PieceImportPanel groupSlug={groupSlug} group={importGroup} onClose={() => setIsImportOpen(false)} />
      ) : (
        <SearchablePiecesTable
          pieces={pieces}
          people={people}
          creditRoles={creditRoles}
          groupSlug={groupSlug}
        />
      )}
    </>
  );
```

## 4. The engine's vocabulary: the types in `lib/pieces/import.ts`

Everything from here to section 10 is in one file with no I/O, which is what lets it run in both the browser and the server action. It starts with two limits and the two *inputs* to the plan: the `ImportGroup` (what we match against) and the `ImportChoices` (what the user has overridden in the preview).

```bash
sed -n '20,41p' lib/pieces/import.ts

```

```tsx
export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_NAME_LENGTH = 200;

/** What the import matches against: the Group's People, Credit roles in use and Piece titles. */
export type ImportGroup = {
  people: { id: string; name: string }[];
  /** The Credit roles on the Group's Credits, as stored. */
  creditRoles: string[];
  pieceTitles: string[];
};

export const EMPTY_IMPORT_GROUP: ImportGroup = { people: [], creditRoles: [], pieceTitles: [] };

/** The user's choices in the preview. */
export type ImportChoices = {
  /** Use a column (by its index in the paste) as a Credit role or not, where it differs from the default. */
  columns: Record<number, boolean>;
  /** Lines of duplicate titles to add anyway. */
  addDuplicateLines: number[];
};

export const NO_IMPORT_CHOICES: ImportChoices = { columns: {}, addDuplicateLines: [] };
```

`ImportChoices` deliberately stores only *overrides*. `columns` maps a column index to on/off only where the user flipped the default, and `addDuplicateLines` lists line numbers of duplicate titles the user ticked "Lägg till ändå" for. Keeping choices this small matters because they are posted to the server as JSON and must mean the same thing when the plan is rebuilt there.

Then the *output* types. A person in the paste is either an `existing` Person (with an id) or a `new` one (name only). A row carries its cells for display, its Credits grouped per Person for saving, and whether it is a duplicate and will be added:

```bash
sed -n '43,94p' lib/pieces/import.ts

```

```tsx
export type ImportDelimiter = "\t" | ";" | ",";

export type ImportColumn = {
  /** Index in the pasted row; the title is column 0. */
  index: number;
  header: string;
  /** The Credit role the header names, in the spelling to store. */
  role: string;
  /** Why the column can't be a Credit role, if it can't. */
  unusableReason: string | null;
  isNewToGroup: boolean;
  use: boolean;
};

export type ImportPerson = { kind: "existing"; id: string; name: string } | { kind: "new"; name: string };

export type ImportCredit = { person: ImportPerson; roles: string[] };

export type ImportCell = { kind: "people"; people: ImportPerson[] } | { kind: "ignored"; text: string };

export type ImportRow = {
  line: number;
  title: string;
  /** One per column, in column order. */
  cells: ImportCell[];
  /** Grouped per Person, in the order they first appear in the row. */
  credits: ImportCredit[];
  duplicate: null | "existing" | "earlier";
  add: boolean;
};

export type SkippedImportRow = { line: number; raw: string; reason: string };

export type ImportPreview = {
  kind: "preview";
  delimiter: ImportDelimiter;
  columns: ImportColumn[];
  rows: ImportRow[];
  skipped: SkippedImportRow[];
  /** The new People the import creates, in the spelling it creates them with. */
  newPeople: string[];
  counts: {
    pieces: number;
    skipped: number;
    newPeople: number;
    newCreditRoles: string[];
  };
};

export type ImportPlan = { kind: "empty" } | { kind: "tooMany"; rowCount: number } | ImportPreview;

type RawRecord = { line: number; raw: string; cells: string[]; error: string | null };
```

`ImportPlan` is a three-way union: nothing pasted yet (`empty`), over the row limit (`tooMany`, so the UI can say so instead of silently truncating), or a full `preview`. `RawRecord` is the internal, pre-matching form of one pasted record: its 1-based `line`, the `raw` text (shown for skipped rows), its `cells`, and an `error` if it couldn't be split.

## 5. Reading the paste: `detectDelimiter`

Spreadsheets paste as tab-separated text, but people also paste CSV exports with `;` or `,`. The delimiter is chosen from the **header row only**, in priority order tab → `;` → `,`:

```bash
sed -n '98,105p' lib/pieces/import.ts

```

```tsx
/**
 * Tab first, then `;`, then `,`, by which the header row contains. A header
 * with none of them is a paste of titles only, so its rows aren't split.
 */
function detectDelimiter(text: string): ImportDelimiter {
  const header = text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  return (["\t", ";", ","] as const).find((delimiter) => header.includes(delimiter)) ?? "\t";
}
```

The fallback matters: a header with no delimiter at all means a titles-only paste, and it falls back to tab — so a title like *Ave, verum corpus* in a later row is *not* split on its comma (one of the fixes in `da2ef1f`). Here it is on four pastes:

```bash
npx --yes tsx@4.23.15 -e '
import { buildImportPlan, EMPTY_IMPORT_GROUP, NO_IMPORT_CHOICES } from "@/lib/pieces/import";
for (const text of ["Titel\tKompositör\nA\tBach", "Titel;Kompositör\nA;Bach", "Titel,Kompositör\nA,Bach", "Titel\nAve, verum corpus"]) {
  const plan = buildImportPlan(text, EMPTY_IMPORT_GROUP, NO_IMPORT_CHOICES);
  if (plan.kind === "preview") console.log(JSON.stringify(plan.delimiter), JSON.stringify(plan.rows.map((r) => r.title)));
}
'

```

```output
"\t" ["A"]
";" ["A"]
"," ["A"]
"\t" ["Ave, verum corpus"]
```

## 6. Splitting records: `readRecords` and `readQuoted`

`readRecords` is a small hand-written RFC 4180 reader. It walks the text one character at a time, building `cells` for the current record. Three things can happen at each character: a `"` at the *start* of a cell hands off to `readQuoted`; the delimiter closes the cell; a line break ends the record. Anything else is appended to the cell — and leading spaces don't count as "having started" the cell, so `  "quoted"` still reads as quoted.

```bash
sed -n '107,178p' lib/pieces/import.ts

```

```tsx
function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return starts;
}

/**
 * Splits the text into records by RFC 4180: a cell starting with `"` runs to
 * the closing `"`, may hold delimiters and line breaks, and `""` is a `"`. A
 * quote that is never closed makes its record unreadable, and reading goes on
 * from the line after the one it started on. A closing `"` must end the cell,
 * so a stray quote can't pair with a later row's opening one and swallow the
 * rows between.
 */
function readRecords(text: string, delimiter: ImportDelimiter): RawRecord[] {
  const starts = lineStarts(text);
  const lineAt = (offset: number) => {
    let line = 0;
    while (line + 1 < starts.length && starts[line + 1] <= offset) line++;
    return line;
  };
  const records: RawRecord[] = [];
  let i = 0;

  while (i < text.length) {
    const start = i;
    const cells: string[] = [];
    let cell = "";
    let error: string | null = null;
    let atCellStart = true;

    while (i < text.length) {
      const ch = text[i];
      if (atCellStart && ch === '"') {
        const close = readQuoted(text, i + 1, delimiter);
        if (close === null) {
          error = UNCLOSED_QUOTE;
          break;
        }
        cell += close.value;
        i = close.end;
        atCellStart = false;
      } else if (ch === delimiter) {
        cells.push(cell);
        cell = "";
        atCellStart = true;
        i++;
      } else if (ch === "\n" || ch === "\r") {
        break;
      } else {
        cell += ch;
        if (ch !== " ") atCellStart = false;
        i++;
      }
    }

    const line = lineAt(start);
    if (error) {
      const nextLine = starts[line + 1] ?? text.length;
      records.push({ line: line + 1, raw: text.slice(start, nextLine).replace(/\r?\n$/, ""), cells: [], error });
      i = nextLine;
      continue;
    }

    cells.push(cell);
    records.push({ line: line + 1, raw: text.slice(start, i), cells, error: null });
    if (text[i] === "\r") i++;
    if (text[i] === "\n") i++;
  }

  return records;
}
```

Two details worth slowing down for:

- **Line numbers.** `lineStarts` records the offset of each line, and `lineAt` maps a record's start offset back to its line. That keeps line numbers right even when a quoted cell spans several lines, so "Rad 7" in the preview is the seventh line of what the user pasted.
- **Error recovery.** When a quoted cell never closes properly, the record gets `UNCLOSED_QUOTE` and reading resumes at the *line after the one the record started on*. One bad row costs one row.

`readQuoted` reads from just after the opening quote. `""` is an escaped quote; a lone `"` closes the cell — but only if what follows actually ends the cell (end of text, the delimiter, or a line break). Otherwise it returns `null`, which `readRecords` treats as unreadable:

```bash
sed -n '180,200p' lib/pieces/import.ts

```

```tsx
/** The quoted cell's text from just after its opening `"`, or null when it never closes. */
function readQuoted(
  text: string,
  from: number,
  delimiter: ImportDelimiter
): { value: string; end: number } | null {
  let value = "";
  for (let i = from; i < text.length; i++) {
    if (text[i] !== '"') {
      value += text[i];
    } else if (text[i + 1] === '"') {
      value += '"';
      i++;
    } else {
      const next = text[i + 1];
      const endsCell = next === undefined || next === delimiter || next === "\n" || next === "\r";
      return endsCell ? { value, end: i + 1 } : null;
    }
  }
  return null;
}
```

That "must end the cell" rule is the second fix in `da2ef1f`. Without it, a stray quote such as `"Trasig" rad` would close at `Trasig"`, keep reading, and a later opening quote could pair up with something unexpected — swallowing every row in between into one giant cell. Now that row alone is skipped. Here is a comma-separated paste with a delimiter inside quotes, an escaped quote, a line break inside quotes, a blank line, and a stray quote:

```bash
npx --yes tsx@4.23.15 -e '
import { buildImportPlan, EMPTY_IMPORT_GROUP, NO_IMPORT_CHOICES } from "@/lib/pieces/import";
const text = [
  "Titel,Kompositör",
  "\"Uti vår hage, folkvisa\",Bach",
  "\"Säg \"\"hej\"\"\",Bach",
  "\"Rad",
  "brytning\",Bach",
  "",
  "\"Trasig\" rad,Bach",
  "Sista,Bach",
].join("\n");
const plan = buildImportPlan(text, EMPTY_IMPORT_GROUP, NO_IMPORT_CHOICES);
if (plan.kind !== "preview") throw new Error(plan.kind);
for (const row of plan.rows) console.log("line", row.line, JSON.stringify(row.title));
for (const row of plan.skipped) console.log("line", row.line, "skipped:", row.reason, "|", row.raw);
'

```

```output
line 2 "Uti vår hage, folkvisa"
line 3 "Säg \"hej\""
line 4 "Rad brytning"
line 8 "Sista"
line 7 skipped: Ett citattecken stängs aldrig | "Trasig" rad,Bach
```

The line break inside the quoted title on lines 4–5 survived reading, then `normalizeSpacing` collapsed it to one space. Line 6 (blank) produced neither a row nor a skip, and line 8 still reads after the bad line 7. The blank-record filter and the `;`-splitting of names in a cell are both one-liners:

```bash
sed -n '202,206p' lib/pieces/import.ts

```

```tsx
const isBlank = (record: RawRecord) => record.error === null && record.cells.every((c) => c.trim() === "");

function splitNames(cell: string): string[] {
  return cell.split(";").map(normalizeSpacing).filter((name) => name !== "");
}
```

## 7. Columns: which headers become Credit roles (`readColumns`)

The first column is always the title, whatever its header says. Every other column is a candidate Credit role named by its header. `readColumns` works out, per column: the role spelling to store (via `resolveCreditRole`), whether it can't be a role at all (empty header, or longer than the 50-character role limit), whether it is new to this Group, and whether it is used.

```bash
sed -n '208,232p' lib/pieces/import.ts

```

```tsx
function readColumns(header: string[], group: ImportGroup, choices: ImportChoices): ImportColumn[] {
  const knownRoleKeys = new Set([...BUILT_IN_CREDIT_ROLES, ...group.creditRoles].map(matchKey));
  const groupRoleKeys = new Set(group.creditRoles.map(matchKey));

  return header.slice(1).map((rawHeader, i) => {
    const index = i + 1;
    const headerText = normalizeSpacing(rawHeader);
    const role = resolveCreditRole(headerText, group.creditRoles);
    const unusableReason =
      headerText === ""
        ? "Rubrik saknas"
        : headerText.length > MAX_CREDIT_ROLE_LENGTH
          ? `Rollen får vara högst ${MAX_CREDIT_ROLE_LENGTH} tecken`
          : null;
    const isKnown = knownRoleKeys.has(matchKey(headerText));
    return {
      index,
      header: headerText,
      role,
      unusableReason,
      isNewToGroup: !groupRoleKeys.has(matchKey(headerText)),
      use: unusableReason === null && (choices.columns[index] ?? isKnown),
    };
  });
}
```

The `use` line is the whole default-plus-override rule: an unusable column is never used; otherwise the user's choice wins if there is one, and the default is "used if the header is a known role" — built-in or already used in the Group. So a header like *Anteckning* is ignored by default (its text is shown greyed out in the preview) but the user can flip it to *Roll*.

Note `isNewToGroup` is checked against the Group's roles only, not the built-in ones: *Arrangör* is a built-in role but still "new to the Group" until some Credit in the Group uses it. Here is a Group that already uses *Sopran*:

```bash
npx --yes tsx@4.23.15 -e '
import { buildImportPlan, NO_IMPORT_CHOICES } from "@/lib/pieces/import";
const group = { people: [], creditRoles: ["Sopran"], pieceTitles: [] };
const text = "Titel\tKOMPOSITÖR\t sopran \tAnteckning\t\nA\tBach\tAnna\tfin\t";
const show = (choices) => {
  const plan = buildImportPlan(text, group, choices);
  if (plan.kind !== "preview") throw new Error(plan.kind);
  console.table(plan.columns.map(({ index, header, role, use, isNewToGroup, unusableReason }) => ({ index, header, role, use, isNewToGroup, unusableReason })));
};
show(NO_IMPORT_CHOICES);
console.log("after the user switches column 3 to Roll:");
show({ columns: { 3: true }, addDuplicateLines: [] });
'

```

```output
┌─────────┬───────┬──────────────┬──────────────┬───────┬──────────────┬─────────────────┐
│ (index) │ index │ header       │ role         │ use   │ isNewToGroup │ unusableReason  │
├─────────┼───────┼──────────────┼──────────────┼───────┼──────────────┼─────────────────┤
│ 0       │ 1     │ 'KOMPOSITÖR' │ 'Kompositör' │ true  │ true         │ null            │
│ 1       │ 2     │ 'sopran'     │ 'Sopran'     │ true  │ false        │ null            │
│ 2       │ 3     │ 'Anteckning' │ 'Anteckning' │ false │ true         │ null            │
│ 3       │ 4     │ ''           │ ''           │ false │ true         │ 'Rubrik saknas' │
└─────────┴───────┴──────────────┴──────────────┴───────┴──────────────┴─────────────────┘
after the user switches column 3 to Roll:
┌─────────┬───────┬──────────────┬──────────────┬───────┬──────────────┬─────────────────┐
│ (index) │ index │ header       │ role         │ use   │ isNewToGroup │ unusableReason  │
├─────────┼───────┼──────────────┼──────────────┼───────┼──────────────┼─────────────────┤
│ 0       │ 1     │ 'KOMPOSITÖR' │ 'Kompositör' │ true  │ true         │ null            │
│ 1       │ 2     │ 'sopran'     │ 'Sopran'     │ true  │ false        │ null            │
│ 2       │ 3     │ 'Anteckning' │ 'Anteckning' │ true  │ true         │ null            │
│ 3       │ 4     │ ''           │ ''           │ false │ true         │ 'Rubrik saknas' │
└─────────┴───────┴──────────────┴──────────────┴───────┴──────────────┴─────────────────┘
```

## 8. Rows that can't be read: `rowProblem`

Each data record is checked before any matching. The checks run in order and the first problem found is the reason shown in the preview: a record-level read error, a missing title, cells *with content* past the last header (empty trailing cells are fine — spreadsheets paste those), a title over 200 characters, or a name over 200 characters in a used column. Only *used* columns are checked for long names, since an ignored column's text is never saved.

```bash
sed -n '234,246p' lib/pieces/import.ts

```

```tsx
/** Why the row can't be read, or null when it can. */
function rowProblem(record: RawRecord, headerCount: number, columns: ImportColumn[]): string | null {
  if (record.error) return record.error;
  const title = normalizeSpacing(record.cells[0] ?? "");
  if (title === "") return "Titel saknas";
  if (record.cells.slice(headerCount).some((cell) => cell.trim() !== "")) return "Fler celler än rubriker";
  if (title.length > MAX_IMPORT_NAME_LENGTH) return `Titeln är längre än ${MAX_IMPORT_NAME_LENGTH} tecken`;
  const names = columns.filter((c) => c.use).flatMap((c) => splitNames(record.cells[c.index] ?? ""));
  if (names.some((name) => name.length > MAX_IMPORT_NAME_LENGTH)) {
    return `Ett namn är längre än ${MAX_IMPORT_NAME_LENGTH} tecken`;
  }
  return null;
}
```

## 9. The heart: `buildImportPlan`

Now everything comes together. The setup: bail out on whitespace-only text, detect the delimiter, read records, drop blank ones, peel off the header, enforce the 500-row limit, read the columns, and build the lookup structures.

```bash
sed -n '248,269p' lib/pieces/import.ts

```

```tsx
/** Reads the paste and matches it against the Group. Writes nothing. */
export function buildImportPlan(text: string, group: ImportGroup, choices: ImportChoices): ImportPlan {
  if (text.trim() === "") return { kind: "empty" };

  const delimiter = detectDelimiter(text);
  const [header, ...data] = readRecords(text, delimiter).filter((record) => !isBlank(record));
  if (!header) return { kind: "empty" };
  if (data.length > MAX_IMPORT_ROWS) return { kind: "tooMany", rowCount: data.length };

  const columns = readColumns(header.cells, group, choices);
  const usedColumns = columns.filter((c) => c.use);
  const existingPeople = new Map<string, ImportPerson>();
  for (const person of group.people) {
    const key = matchKey(person.name);
    if (!existingPeople.has(key)) existingPeople.set(key, { kind: "existing", id: person.id, name: person.name });
  }
  const newPeople = new Map<string, ImportPerson>();
  const existingTitles = new Set(group.pieceTitles.map(matchKey));
  const seenTitles = new Set<string>();
  const addDuplicateLines = new Set(choices.addDuplicateLines);
  const rows: ImportRow[] = [];
  const skipped: SkippedImportRow[] = [];
```

Four lookups drive the matching:

- `existingPeople` — the Group's People by `matchKey`. If two existing People share a key, the first (by name, then id, from the query's ordering) wins.
- `newPeople` — People the paste will create, also by `matchKey`, filled in as the loop meets them. Being a `Map` keyed by match key means the *first spelling seen* is the one created, and later rows reuse the same `ImportPerson` object.
- `existingTitles` / `seenTitles` — for spotting a title the Group already has, or one an earlier row of this paste already had.
- `addDuplicateLines` — the user's "add anyway" ticks, as a `Set` for quick lookup.

The per-row loop:

```bash
sed -n '271,311p' lib/pieces/import.ts

```

```tsx
  for (const record of data) {
    const problem = rowProblem(record, header.cells.length, columns);
    if (problem) {
      skipped.push({ line: record.line, raw: record.raw, reason: problem });
      continue;
    }

    const title = normalizeSpacing(record.cells[0]);
    const titleKey = matchKey(title);
    const duplicate = existingTitles.has(titleKey) ? "existing" : seenTitles.has(titleKey) ? "earlier" : null;
    seenTitles.add(titleKey);
    const add = duplicate === null || addDuplicateLines.has(record.line);

    const personFor = (name: string): ImportPerson => {
      const key = matchKey(name);
      const known = existingPeople.get(key) ?? newPeople.get(key);
      if (known) return known;
      const person: ImportPerson = { kind: "new", name };
      // Only a Piece that is added creates its People.
      if (add) newPeople.set(key, person);
      return person;
    };

    const credits = new Map<string, ImportCredit>();
    const cells: ImportCell[] = columns.map((column) => {
      const raw = record.cells[column.index] ?? "";
      if (!column.use) return { kind: "ignored", text: raw.trim() };
      const people: ImportPerson[] = [];
      for (const name of splitNames(raw)) {
        const person = personFor(name);
        const key = matchKey(person.name);
        if (!people.some((p) => matchKey(p.name) === key)) people.push(person);
        const credit = credits.get(key) ?? { person, roles: [] };
        if (!credit.roles.includes(column.role)) credit.roles.push(column.role);
        credits.set(key, credit);
      }
      return { kind: "people", people };
    });

    rows.push({ line: record.line, title, cells, credits: [...credits.values()], duplicate, add });
  }
```

Reading it top to bottom:

1. A row with a problem goes to `skipped` and the loop moves on.
2. The title is normalized and checked for duplicates — `existing` beats `earlier`. Every title is added to `seenTitles`, even a duplicate, so a third copy is also an `earlier` duplicate.
3. `add` is true for non-duplicates, or for duplicates the user ticked.
4. `personFor` resolves a name: existing Person first, then a new Person already planned, else a fresh `new` one. The comment carries a subtle rule: **only a row that is added registers its new People.** A skipped duplicate still *shows* its People as new chips, but they won't be created — unless the user ticks the row, which re-runs the plan with that line in `addDuplicateLines`.
5. For each column, an ignored cell keeps its text for display; a used cell is split on `;` into People. Within a cell a repeated name is shown once. Across cells, `credits` groups by Person so that one Person in *Kompositör* and *Textförfattare* gets one `ImportCredit` with two roles, and two columns that resolve to the same role don't give a Person that role twice.

Finally, the counts. `newCreditRoles` lists roles new to the Group that some *added* row actually uses (an empty new column creates no role, because roles only exist through Credits), de-duplicated in column order. `skipped` in the counts includes both unreadable rows and duplicates left out.

```bash
sed -n '313,333p' lib/pieces/import.ts

```

```tsx
  const addedRows = rows.filter((row) => row.add);
  const newCreditRoles = usedColumns
    .filter((c) => c.isNewToGroup && addedRows.some((row) => row.credits.some((cr) => cr.roles.includes(c.role))))
    .map((c) => c.role)
    .filter((role, i, all) => all.indexOf(role) === i);

  return {
    kind: "preview",
    delimiter,
    columns,
    rows,
    skipped,
    newPeople: [...newPeople.values()].map((person) => person.name),
    counts: {
      pieces: addedRows.length,
      skipped: skipped.length + rows.length - addedRows.length,
      newPeople: newPeople.size,
      newCreditRoles,
    },
  };
}
```

Here is the whole thing on a realistic paste. The Group already has *Anna Berg*, uses the role *Kompositör*, and has a Piece called *Ave Maria*:

```bash
npx --yes tsx@4.23.15 -e "$(cat <<'TS'
import { buildImportPlan, type ImportChoices, type ImportGroup } from "@/lib/pieces/import";
const group: ImportGroup = {
  people: [{ id: "p1", name: "Anna Berg" }],
  creditRoles: ["Kompositör"],
  pieceTitles: ["Ave Maria"],
};
const text = [
  "Titel\tKompositör\tTextförfattare\tArrangör",
  "Gläns över sjö och strand\tAlice Tegnér\tViktor Rydberg\t",
  "Uti vår hage\tanna  berg; Hugo Alfvén\tANNA BERG\tHugo Alfvén",
  "Ave maria\tSchubert",
  "uti vår hage",
  "\tBach",
].join("\n");
function show(choices: ImportChoices) {
  const plan = buildImportPlan(text, group, choices);
  if (plan.kind !== "preview") throw new Error(plan.kind);
  for (const row of plan.rows) {
    const credits = row.credits.map((c) => `${c.person.kind === "existing" ? "=" : "+"}${c.person.name} (${c.roles.join(", ")})`);
    console.log(`line ${row.line}  ${row.add ? "ADD " : "skip"}  ${row.title}${row.duplicate ? ` [duplicate: ${row.duplicate}]` : ""}`);
    if (credits.length) console.log(`         ${credits.join(" · ")}`);
  }
  for (const row of plan.skipped) console.log(`line ${row.line}  skip  (${row.reason})`);
  console.log("newPeople:", JSON.stringify(plan.newPeople));
  console.log("counts:", JSON.stringify(plan.counts));
}
show({ columns: {}, addDuplicateLines: [] });
TS
)"

```

```output
line 2  ADD   Gläns över sjö och strand
         +Alice Tegnér (Kompositör) · +Viktor Rydberg (Textförfattare)
line 3  ADD   Uti vår hage
         =Anna Berg (Kompositör, Textförfattare) · +Hugo Alfvén (Kompositör, Arrangör)
line 4  skip  Ave maria [duplicate: existing]
         +Schubert (Kompositör)
line 5  skip  uti vår hage [duplicate: earlier]
line 6  skip  (Titel saknas)
newPeople: ["Alice Tegnér","Viktor Rydberg","Hugo Alfvén"]
counts: {"pieces":2,"skipped":3,"newPeople":3,"newCreditRoles":["Textförfattare","Arrangör"]}
```

`=` marks an existing Person, `+` a new one. Things to notice:

- *anna  berg* and *ANNA BERG* both matched the existing *Anna Berg*, and she got one Credit with two roles.
- *Hugo Alfvén*, named in two columns, got one Credit with *Kompositör* and *Arrangör*.
- Line 4, *Ave maria*, is an `existing` duplicate of *Ave Maria*; line 5 is an `earlier` duplicate of line 3. Both are skipped, and *Schubert* is **not** in `newPeople` because his only row isn't added.
- Line 6 has no title, so it is skipped with its reason.
- *Arrangör* and *Textförfattare* are new to the Group; *Kompositör* isn't.

Now the user ticks "Lägg till ändå" on line 4. The client just re-runs the plan with `addDuplicateLines: [4]` (same Group and paste as above):

```bash
npx --yes tsx@4.23.15 -e "$(cat <<'TS'
import { buildImportPlan, type ImportChoices, type ImportGroup } from "@/lib/pieces/import";
const group: ImportGroup = {
  people: [{ id: "p1", name: "Anna Berg" }],
  creditRoles: ["Kompositör"],
  pieceTitles: ["Ave Maria"],
};
const text = [
  "Titel\tKompositör\tTextförfattare\tArrangör",
  "Gläns över sjö och strand\tAlice Tegnér\tViktor Rydberg\t",
  "Uti vår hage\tanna  berg; Hugo Alfvén\tANNA BERG\tHugo Alfvén",
  "Ave maria\tSchubert",
  "uti vår hage",
  "\tBach",
].join("\n");
function show(choices: ImportChoices) {
  const plan = buildImportPlan(text, group, choices);
  if (plan.kind !== "preview") throw new Error(plan.kind);
  for (const row of plan.rows) {
    const credits = row.credits.map((c) => `${c.person.kind === "existing" ? "=" : "+"}${c.person.name} (${c.roles.join(", ")})`);
    console.log(`line ${row.line}  ${row.add ? "ADD " : "skip"}  ${row.title}${row.duplicate ? ` [duplicate: ${row.duplicate}]` : ""}`);
    if (credits.length) console.log(`         ${credits.join(" · ")}`);
  }
  for (const row of plan.skipped) console.log(`line ${row.line}  skip  (${row.reason})`);
  console.log("newPeople:", JSON.stringify(plan.newPeople));
  console.log("counts:", JSON.stringify(plan.counts));
}
show({ columns: {}, addDuplicateLines: [4] });
TS
)"

```

```output
line 2  ADD   Gläns över sjö och strand
         +Alice Tegnér (Kompositör) · +Viktor Rydberg (Textförfattare)
line 3  ADD   Uti vår hage
         =Anna Berg (Kompositör, Textförfattare) · +Hugo Alfvén (Kompositör, Arrangör)
line 4  ADD   Ave maria [duplicate: existing]
         +Schubert (Kompositör)
line 5  skip  uti vår hage [duplicate: earlier]
line 6  skip  (Titel saknas)
newPeople: ["Alice Tegnér","Viktor Rydberg","Hugo Alfvén","Schubert"]
counts: {"pieces":3,"skipped":2,"newPeople":4,"newCreditRoles":["Textförfattare","Arrangör"]}
```

*Schubert* now appears as a new Person and the counts follow.

## 10. Detecting a stale preview: `importOutcome`

The preview was computed against the Group as the page loaded it. By the time the user clicks Importera, someone else may have added a Person or a Piece. `importOutcome` reduces a preview to a comparable string: per row its line, title, duplicate status, whether it is added, and its Credits — with each Person written as their **id** if existing or `+name` if new — plus the skipped rows and reasons.

```bash
sed -n '335,351p' lib/pieces/import.ts

```

```tsx
/**
 * What the import would do, as a string to compare: the rows with their
 * duplicate status and Credits, and which People are existing or new. A
 * preview whose outcome differs from the one the server gets now is stale.
 */
export function importOutcome(preview: ImportPreview): string {
  return JSON.stringify({
    rows: preview.rows.map((row) => [
      row.line,
      row.title,
      row.duplicate,
      row.add,
      row.credits.map((c) => [c.person.kind === "existing" ? c.person.id : `+${c.person.name}`, c.roles]),
    ]),
    skipped: preview.skipped.map((row) => [row.line, row.reason]),
  });
}
```

What's *in* the fingerprint is exactly what would change what gets saved: if *Hugo Alfvén* were added to the Group meanwhile, he'd flip from `+Hugo Alfvén` to an id; if *Gläns över sjö och strand* were added as a Piece, that row would flip to a duplicate. What's *not* in it — column headers, counts — is derived from those. Watch it change:

```bash
npx --yes tsx@4.23.15 -e "$(cat <<'TS'
import { buildImportPlan, importOutcome, NO_IMPORT_CHOICES, type ImportGroup, type ImportPreview } from "@/lib/pieces/import";
const group: ImportGroup = {
  people: [{ id: "p1", name: "Anna Berg" }],
  creditRoles: ["Kompositör"],
  pieceTitles: ["Ave Maria"],
};
const text = [
  "Titel\tKompositör\tTextförfattare\tArrangör",
  "Gläns över sjö och strand\tAlice Tegnér\tViktor Rydberg\t",
  "Uti vår hage\tanna  berg; Hugo Alfvén\tANNA BERG\tHugo Alfvén",
  "Ave maria\tSchubert",
  "uti vår hage",
  "\tBach",
].join("\n");
const outcomeFor = (g: ImportGroup) => importOutcome(buildImportPlan(text, g, NO_IMPORT_CHOICES) as ImportPreview);
const previewed = outcomeFor(group);
console.log(previewed);
console.log("same Group again:         ", outcomeFor({ ...group }) === previewed);
const withHugo = { ...group, people: [...group.people, { id: "p2", name: "Hugo Alfvén" }] };
console.log("Hugo Alfvén added since:  ", outcomeFor(withHugo) === previewed);
const withPiece = { ...group, pieceTitles: [...group.pieceTitles, "Gläns över sjö och strand"] };
console.log("a Piece title added since:", outcomeFor(withPiece) === previewed);
TS
)"

```

```output
{"rows":[[2,"Gläns över sjö och strand",null,true,[["+Alice Tegnér",["Kompositör"]],["+Viktor Rydberg",["Textförfattare"]]]],[3,"Uti vår hage",null,true,[["p1",["Kompositör","Textförfattare"]],["+Hugo Alfvén",["Kompositör","Arrangör"]]]],[4,"Ave maria","existing",false,[["+Schubert",["Kompositör"]]]],[5,"uti vår hage","earlier",false,[]]],"skipped":[[6,"Titel saknas"]]}
same Group again:          true
Hugo Alfvén added since:   false
a Piece title added since: false
```

## 11. The client: `PieceImportPanel` and `PieceImportPreview`

`PieceImportPanel` holds very little state: the pasted `text`, the user's `choices`, the `group` to match against (seeded from the page, replaceable by the server), and some flags for errors, a changed Group and the final summary. The plan itself is **not state** — it is derived with `useMemo` from those three inputs, so the preview is always exactly `buildImportPlan(text, group, choices)`.

```bash
sed -n '40,58p' components/pieces/import/PieceImportPanel.tsx

```

```tsx
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
```

`changeText` resets the choices on every edit. That's necessary, not just tidy: choices are keyed by column index and *line number*, and a different paste could put a different column or row at those positions. It also clears the error and the "Group changed" banner, since the user is now looking at a new preview.

The two preview callbacks just update `choices`, which re-derives the plan:

```bash
sed -n '60,71p' components/pieces/import/PieceImportPanel.tsx

```

```tsx
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
```

`PieceImportPreview` is presentational. It interleaves the readable rows and the skipped rows back into paste order by line number, so an unreadable row stays where the user pasted it, with its raw text and reason:

```bash
sed -n '20,23p' components/pieces/import/PieceImportPreview.tsx

```

```tsx
  const lines: ({ kind: "row"; row: ImportRow } | { kind: "skipped"; row: SkippedImportRow })[] = [
    ...preview.rows.map((row) => ({ kind: "row" as const, row })),
    ...preview.skipped.map((row) => ({ kind: "skipped" as const, row })),
  ].sort((a, b) => a.row.line - b.row.line);
```

Each column header shows either why it can't be used or a *Roll / Ignorera* toggle (wired to `onColumnChange`) with "Ny roll i gruppen" or the existing role it matched; each duplicate row gets a "Lägg till ändå" checkbox (wired to `onDuplicateChange`); and each Person renders as a chip — solid green for an existing Person, dashed blue for one the import creates.

```bash
grep -n 'onChange(column.index\|isNewToGroup ?\|onDuplicateChange(row.line\|const isNew' components/pieces/import/PieceImportPreview.tsx

```

```output
104:              onClick={() => onChange(column.index, true)}
112:              onClick={() => onChange(column.index, false)}
120:              {column.isNewToGroup ? "Ny roll i gruppen" : `Befintlig roll: ${column.role}`}
166:                onCheckedChange={(checked) => onDuplicateChange(row.line, checked === true)}
184:  const isNew = person.kind === "new";
```

Back in the panel, `confirm` is where the client hands over. It posts the **raw inputs** — slug, text and choices as JSON — plus `importOutcome(preview)`, the fingerprint of what the user is looking at. Then it handles the two results: `changed` swaps in the server's fresh Group (which re-derives the preview through `useMemo`) and shows the amber banner; `imported` shows the summary and refreshes the server components underneath. A thrown error (e.g. the user lost write access) is shown in the sticky bar.

```bash
sed -n '78,100p' components/pieces/import/PieceImportPanel.tsx

```

```tsx
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
```

Posting the inputs instead of the computed plan is the key security property: the server never trusts a client-built list of Pieces, Person ids or roles. A tampered request can at most change the text or choices — which the server reads and validates like any paste — or the outcome string, which only decides whether to save or reply `changed`.

## 12. The server: parsing the form, `importPieces` and `saveImport`

First the form data is parsed. The text is capped at a million characters (the server action body limit is lower still), and the choices JSON must match a strict Zod schema: column keys must be numeric strings, duplicate lines positive integers. The outcome is taken as an opaque string.

```bash
sed -n '198,227p' lib/schemas/pieces.ts

```

```tsx
const INVALID_IMPORT_ERROR = "Ogiltig import";

/** Generous for 500 rows; the server action body limit is lower still. */
const MAX_IMPORT_TEXT_LENGTH = 1_000_000;

const importChoicesSchema = z.object({
  columns: z.record(z.string().regex(/^\d+$/), z.boolean()),
  addDuplicateLines: z.array(z.number().int().positive()),
});

/** The pasted text, the user's choices and the outcome they previewed, posted to confirm a Piece import. */
export function parsePieceImportFromFormData(formData: FormData): {
  text: string;
  choices: ImportChoices;
  outcome: string;
} {
  const text = formDataString(formData, "text");
  if (text.length > MAX_IMPORT_TEXT_LENGTH) throw new Error("Texten är för lång");

  let parsed: unknown;
  try {
    parsed = JSON.parse(formDataString(formData, "choices"));
  } catch {
    throw new Error(INVALID_IMPORT_ERROR);
  }
  const choices = importChoicesSchema.safeParse(parsed);
  if (!choices.success) throw new Error(INVALID_IMPORT_ERROR);

  return { text, choices: choices.data, outcome: formDataString(formData, "outcome") };
}
```

Then the action itself:

```bash
sed -n '77,123p' app/actions/pieces.ts

```

```tsx
export type PieceImportResult =
  | { kind: "imported"; summary: ImportPreview["counts"] }
  /** The Group changed since the preview: nothing was saved, and this is the Group now. */
  | { kind: "changed"; group: ImportGroup };

/**
 * Confirms a Piece import. Reads the paste again against the Group as it is
 * now and saves nothing if that differs from the outcome the user previewed;
 * otherwise saves every Piece, new Person and Credit in one transaction.
 */
export async function importPieces(formData: FormData): Promise<PieceImportResult> {
  const groupSlug = parseWritableGroupSlugFromFormData(formData);
  const { text, choices, outcome } = parsePieceImportFromFormData(formData);

  const result = await runContentMutation(groupSlug, async ({ userId, groupId }): Promise<PieceImportResult> => {
    try {
      return await prisma.$transaction(
        async (tx): Promise<PieceImportResult> => {
          const group = await getPieceImportGroupFor(groupId, tx);
          const plan = buildImportPlan(text, group, choices);
          if (plan.kind === "tooMany") {
            throw new Error(`Högst ${MAX_IMPORT_ROWS} rader kan importeras åt gången`);
          }
          if (plan.kind === "empty") throw new Error(NOTHING_TO_IMPORT);
          if (importOutcome(plan) !== outcome) return { kind: "changed", group };
          if (plan.counts.pieces === 0) throw new Error(NOTHING_TO_IMPORT);

          await saveImport(tx, plan, { groupId, userId });
          return { kind: "imported", summary: plan.counts };
        },
        // Serializable, so a Person or Piece someone adds meanwhile fails the save rather than being duplicated.
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 }
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
        return { kind: "changed", group: await getPieceImportGroupFor(groupId) };
      }
      throw err;
    }
  });

  // New Pieces are in no Set list and new People only show on these pages.
  if (result.kind === "imported") revalidateGroupPeopleRoutes(groupSlug);
  return result;
}

const NOTHING_TO_IMPORT = "Det finns inga noter att importera";
```

Step by step:

1. `parseWritableGroupSlugFromFormData` and `parsePieceImportFromFormData` validate the input before any database work.
2. `runContentMutation` is the app's one door for content changes: it checks the session and that the user can `manageContent` in that Group, and hands the callback the `userId` and `groupId`.
3. Inside a **serializable** transaction it loads the `ImportGroup` with `getPieceImportGroupFor(groupId, tx)` — the same query as the page, now through `tx`.
4. It runs `buildImportPlan` on the posted text and choices. `tooMany` and `empty` throw (the client can't normally send those, since the button is hidden or disabled).
5. **The staleness check**: if `importOutcome(plan)` differs from the posted `outcome`, it returns `{ kind: "changed", group }` — saving nothing, and handing back the Group it just read so the client can redraw.
6. A preview with zero Pieces to add (everything a duplicate, say) throws "Det finns inga noter att importera".
7. Otherwise `saveImport` writes, and the action returns the plan's counts for the summary.

Why serializable? Steps 3–7 are a read-then-write. At a weaker isolation level, another request could insert *Hugo Alfvén* between our read and our write, and the import would create a second *Hugo Alfvén*. Under `Serializable`, Postgres detects that the transaction's reads are no longer valid and aborts it; Prisma surfaces that as `P2034`. The `catch` turns exactly that error into another `changed` reply — re-reading the Group *outside* the failed transaction — so a race looks to the user just like any other "the Group changed, check the preview" (the third fix in `da2ef1f`). Any other error propagates.

After a successful import, `revalidateGroupPeopleRoutes` refreshes the cached pages that list Pieces and People; new Pieces are in no Set list, so nothing else needs revalidating.

`saveImport` is three bulk inserts:

```bash
sed -n '125,150p' app/actions/pieces.ts

```

```tsx
/** Writes the preview's added Pieces, its new People and their Credits. */
async function saveImport(
  tx: Prisma.TransactionClient,
  plan: ImportPreview,
  { groupId, userId }: { groupId: string; userId: string }
) {
  const pieces = plan.rows.filter((row) => row.add).map((row) => ({ row, id: randomUUID() }));
  const newPersonIds = new Map(plan.newPeople.map((name) => [name, randomUUID()]));
  const personId = (person: ImportPerson) =>
    person.kind === "existing" ? person.id : newPersonIds.get(person.name)!;
  const audit = { createdById: userId, updatedById: userId };

  await tx.person.createMany({
    data: [...newPersonIds].map(([name, id]) => ({ id, name, groupId, ...audit })),
  });
  await tx.piece.createMany({
    data: pieces.map(({ row, id }) => ({ id, name: row.title, groupId, ...audit })),
  });
  await tx.personToPiece.createMany({
    data: pieces.flatMap(({ row, id }) =>
      row.credits.flatMap((credit) =>
        credit.roles.map((role) => ({ pieceId: id, personId: personId(credit.person), role }))
      )
    ),
  });
}
```

The ids are generated up front with `randomUUID()` so that Credits can reference Pieces and new People without reading anything back. New People are keyed by name — safe, because `plan.newPeople` already holds one entry per `matchKey`, in the spelling first seen, and every `ImportPerson` of kind `new` in the rows carries that same spelling (it's the same object from the `newPeople` map). Existing People already have their ids. Order matters for the foreign keys: People, then Pieces, then `PersonToPiece` Credits, one row per Person × role. Because all three run on `tx`, a failure part-way rolls everything back.

## 13. How it is tested

Following `docs/testing.md`, the plan logic is tested where it lives — as a pure function, with plain inputs and outputs — and the action gets a handful of integration tests against a real database. The unit tests in `lib/pieces/import.test.ts` read like a spec of everything above:

```bash
grep -n 'describe(\|  it(' lib/pieces/import.test.ts | sed 's/, () => {$//'

```

```output
32:describe("reading the pasted rows"
33:  it("reads tab-, semicolon- and comma-separated text the same, with quoted cells"
44:  it("reads delimiters, escaped quotes and line breaks inside quoted cells as text"
50:  it("takes the title from the first column whatever its header says"
55:  it("ignores blank rows without a message"
62:  it("is empty until something other than whitespace is pasted"
66:  it(`refuses more than ${MAX_IMPORT_ROWS} rows rather than cutting them short`
76:  it("skips each row it can't read, with its line and reason, and keeps reading after it"
100:  it("reads a paste with only a title column whole, commas and all"
104:  it("skips a row whose stray quote would otherwise swallow the rows up to the next quote"
111:  it("allows empty cells past the last header, as spreadsheets paste them"
116:describe("columns"
119:  it("uses columns named after a built-in or in-use Credit role, and ignores the rest"
130:  it("marks a Credit role new to the Group, built-in ones included, until a Credit uses it"
139:  it("follows the user's choice per column, and an ignored column creates no Credits"
147:  it("never uses a column whose header is empty or too long for a Credit role"
161:describe("matching People and Credits"
171:  it("reuses a Person who differs only in letter case or spacing, but not in accents"
180:  it("gives a Person named in several cells of a row one Credit per role, and counts a repeated name once"
186:  it("merges two columns naming the same Credit role"
192:  it("creates each new Person once, with the first spelling seen"
199:  it("adds a Piece with no Credits when its row has only a title"
203:  it("shows each used cell's People, and an ignored cell's text as it was"
219:describe("duplicate titles"
223:  it("skips a Piece whose title the Group or an earlier row already has"
233:  it("adds a duplicate the user chose to add anyway"
239:  it("leaves the People of a skipped Piece out of the People to create"
246:describe("the summary counts"
247:  it("counts Pieces to add, rows skipped, new People and Credit roles new to the Group"
265:describe("the import outcome"
268:  it("stays the same while the Group doesn't change"
272:  it("changes when a Person or a Piece title has been added to the Group since"
```

The integration tests in `__tests__/integration/piece-import.test.ts` cover what only the database can show: the whole write, reuse of existing People and roles, the stale-preview reply, rollback, and the refusals.

```bash
grep -n '  it(' __tests__/integration/piece-import.test.ts | sed 's/, async () => {$//'

```

```output
60:  it("adds every Piece, new Person and Credit in one go"
74:  it("reuses the Group's People and Credit roles, and skips duplicate titles unless chosen"
100:  it("saves nothing and returns the Group as it is now when it changed since the preview"
115:  it("leaves no Piece, Person or Credit behind when saving fails part-way"
126:  it("refuses an import with nothing to add"
132:  it("refuses more than 500 rows and writes nothing"
```

The stale-preview test is a nice compact demonstration of section 10 and 12 together: it previews against the Group, adds a Person behind the user's back, confirms with the old outcome, and expects `changed` with the new Person in the returned Group and nothing saved.

```bash
sed -n '/saves nothing and returns the Group as it is now/,/^  });/p' __tests__/integration/piece-import.test.ts

```

```tsx
  it("saves nothing and returns the Group as it is now when it changed since the preview", async () => {
    const text = "Titel\tKompositör\nKyrie\tMozart\nGloria\tVivaldi";
    const outcome = await previewedOutcome(group, text, NO_IMPORT_CHOICES);
    const mozart = await createPerson(group, "Mozart");

    const result = await confirm(group, text, NO_IMPORT_CHOICES, outcome);

    expect(result).toEqual({
      kind: "changed",
      group: { people: [{ id: mozart.id, name: "Mozart" }], creditRoles: [], pieceTitles: [] },
    });
    expect(await testPrisma.piece.count({ where: { groupId: group.id } })).toBe(0);
    expect(await peopleInGroup(group)).toEqual(["Mozart"]);
  });
```

The rollback test (rewritten in `9501a6e`) makes the save fail *through the database* rather than by mocking `randomUUID`: a title holding a NUL character, which Postgres refuses, makes the Piece insert fail after the new People were already inserted. The test then checks that neither the People nor any Piece or Credit was left behind, and the Group's existing Piece is untouched.

```bash
sed -n '/leaves no Piece, Person or Credit behind/,/^  });/p' __tests__/integration/piece-import.test.ts

```

```tsx
  it("leaves no Piece, Person or Credit behind when saving fails part-way", async () => {
    await createPiece({ groupId: group.id, createdById: group.createdById, name: "Befintlig" });
    // Postgres refuses text holding a NUL character, so this title fails the save after its People are new.
    const text = "Titel\tKompositör\nKyrie\tMozart\nGlo\u0000ria\tVivaldi";

    await expect(confirm(group, text)).rejects.toThrow();

    expect(await piecesInGroup(group)).toEqual(["Befintlig"]);
    expect(await peopleInGroup(group)).toEqual([]);
  });
```

## Recap

- **One pure function, run twice.** `buildImportPlan(text, group, choices)` turns a paste into a plan with no I/O. The browser runs it on every change for the preview; the server runs it again inside the transaction for the save.
- **Matching is by `matchKey`** — case and spacing don't count, accents do — for People, titles and Credit roles alike, and stored spellings come from what already exists (`resolveCreditRole`, first-seen new Person).
- **Reading is forgiving but contained.** Delimiter from the header row; RFC 4180 quoting where a quote must end its cell; one unreadable row is skipped with its line and reason and never swallows its neighbours.
- **Choices are small overrides** (column on/off, duplicate lines to add), posted as JSON and re-applied on the server.
- **Staleness is detected, not merged.** `importOutcome` fingerprints exactly what would be saved; a mismatch — or a serialization failure (`P2034`) — saves nothing and returns the current Group so the preview redraws.
- **The save is atomic**: three `createMany` calls in one serializable transaction, ids generated up front.


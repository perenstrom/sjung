import {
  BUILT_IN_CREDIT_ROLES,
  MAX_CREDIT_ROLE_LENGTH,
  resolveCreditRole,
} from "@/lib/pieces/credit-roles";
import { matchKey, normalizeSpacing } from "@/lib/text/match-key";

/**
 * Piece import: Pieces with their Credits from rows pasted from a
 * spreadsheet. `buildImportPlan` reads the paste and matches it against the
 * Group. The client shows its preview, and the confirming server action runs
 * it again against the Group as it is then, so it can tell whether the
 * preview went stale (`importOutcome`) before saving.
 */

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

const UNCLOSED_QUOTE = "Ett citattecken stängs aldrig";

/**
 * Tab first, then `;`, then `,`, by which the header row contains. A header
 * with none of them is a paste of titles only, so its rows aren't split.
 */
function detectDelimiter(text: string): ImportDelimiter {
  const header = text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  return (["\t", ";", ","] as const).find((delimiter) => header.includes(delimiter)) ?? "\t";
}

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

const isBlank = (record: RawRecord) => record.error === null && record.cells.every((c) => c.trim() === "");

function splitNames(cell: string): string[] {
  return cell.split(";").map(normalizeSpacing).filter((name) => name !== "");
}

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

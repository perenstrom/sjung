// PROTOTYPE (PER-434) — throwaway. Just enough parse-and-match to feed the UI
// variants with realistic preview data. Not the real implementation.
import { BUILT_IN_CREDIT_ROLES, normalizeCreditRole, rankCreditRoles } from "@/lib/pieces/credit-roles";

export const MAX_ROWS = 500;

export type GroupSnapshot = { people: string[]; roles: string[]; titles: string[] };

export type ImportColumn = {
  index: number;
  header: string;
  role: string;
  roleIsKnown: boolean;
  defaultUse: boolean;
  use: boolean;
  sample: string[];
};

export type ImportPerson = { name: string; isNew: boolean };

export type ImportCredit = { person: ImportPerson; roles: { role: string; isNew: boolean }[] };

export type ImportRow = {
  line: number;
  title: string;
  credits: ImportCredit[];
  rawCells: string[];
  duplicate: null | "existing" | "earlier";
  add: boolean;
};

export type SkippedRow = { line: number; reason: string; raw: string };

export type ImportPreview = {
  delimiter: "tab" | ";" | ",";
  columns: ImportColumn[];
  rows: ImportRow[];
  skipped: SkippedRow[];
  tooMany: number | null;
  newPeople: { name: string; pieces: string[] }[];
  existingPeople: { name: string; pieces: string[] }[];
  newRoles: string[];
  existingRolesUsed: string[];
};

export type ImportChoices = { columnUse: Record<number, boolean>; addDuplicates: Set<number> };

const key = (s: string) => normalizeCreditRole(s).toLocaleLowerCase("sv");

type RawRecord = { line: number; cells: string[]; error?: string; raw: string };

function splitRecords(text: string, delim: string): RawRecord[] {
  const records: RawRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let startLine = 1;
  let rawStart = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell.trim() === "") {
      inQuotes = true;
      cell = "";
    } else if (ch === delim) {
      cells.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      cells.push(cell);
      records.push({ line: startLine, cells, raw: text.slice(rawStart, i).replace(/\r$/, "") });
      cells = [];
      cell = "";
      line++;
      startLine = line;
      rawStart = i + 1;
    } else cell += ch;
  }
  if (inQuotes) {
    records.push({
      line: startLine,
      cells: [],
      error: "Ett citattecken stängs aldrig",
      raw: text.slice(rawStart).split("\n")[0] + " …",
    });
  } else if (cell !== "" || cells.length > 0) {
    cells.push(cell);
    records.push({ line: startLine, cells, raw: text.slice(rawStart) });
  }
  return records;
}

export function detectDelimiter(text: string): "tab" | ";" | "," {
  const header = text.split(/\r?\n/)[0] ?? "";
  if (header.includes("\t")) return "tab";
  if (header.includes(";")) return ";";
  return ",";
}

export function buildPreview(text: string, group: GroupSnapshot, choices: ImportChoices): ImportPreview | null {
  if (text.trim() === "") return null;
  const delimiter = detectDelimiter(text);
  const records = splitRecords(text, delimiter === "tab" ? "\t" : delimiter).filter(
    (r) => r.error || r.cells.some((c) => c.trim() !== "")
  );
  const [header, ...data] = records;
  if (!header) return null;

  const knownRoles = rankCreditRoles(group.roles);
  const knownRoleByKey = new Map(knownRoles.map((r) => [key(r), r]));
  const groupRoleKeys = new Set(group.roles.map(key));
  const columns: ImportColumn[] = header.cells.slice(1).map((h, i) => {
    const index = i + 1;
    const known = knownRoleByKey.get(key(h));
    const defaultUse = known !== undefined;
    return {
      index,
      header: h.trim(),
      role: known ?? normalizeCreditRole(h),
      roleIsKnown: defaultUse,
      defaultUse,
      use: choices.columnUse[index] ?? defaultUse,
      sample: [],
    };
  });

  const tooMany = data.length > MAX_ROWS ? data.length : null;
  const peopleByKey = new Map(group.people.map((p) => [key(p), p]));
  const titleKeys = new Set(group.titles.map(key));
  const seenTitles = new Set<string>();
  const newPeople = new Map<string, { name: string; pieces: string[] }>();
  const existingPeople = new Map<string, { name: string; pieces: string[] }>();
  const rows: ImportRow[] = [];
  const skipped: SkippedRow[] = [];

  for (const rec of data) {
    if (rec.error) {
      skipped.push({ line: rec.line, reason: rec.error, raw: rec.raw });
      continue;
    }
    const title = normalizeCreditRole(rec.cells[0] ?? "");
    if (title === "") {
      skipped.push({ line: rec.line, reason: "Titel saknas", raw: rec.raw });
      continue;
    }
    if (rec.cells.length > header.cells.length) {
      skipped.push({
        line: rec.line,
        reason: `${rec.cells.length} celler men bara ${header.cells.length} rubriker`,
        raw: rec.raw,
      });
      continue;
    }
    if (title.length > 200) {
      skipped.push({ line: rec.line, reason: "Titeln är längre än 200 tecken", raw: rec.raw });
      continue;
    }
    columns.forEach((c) => {
      const v = rec.cells[c.index]?.trim();
      if (v && c.sample.length < 3) c.sample.push(v);
    });

    const creditsByPerson = new Map<string, ImportCredit>();
    for (const col of columns) {
      if (!col.use) continue;
      const names = (rec.cells[col.index] ?? "").split(";").map(normalizeCreditRole).filter(Boolean);
      for (const name of names) {
        const k = key(name);
        const existing = peopleByKey.get(k);
        const pending = newPeople.get(k);
        const person: ImportPerson = existing
          ? { name: existing, isNew: false }
          : { name: pending?.name ?? name, isNew: true };
        const credit = creditsByPerson.get(k) ?? { person, roles: [] };
        if (!credit.roles.some((r) => key(r.role) === key(col.role)))
          credit.roles.push({ role: col.role, isNew: !groupRoleKeys.has(key(col.role)) });
        creditsByPerson.set(k, credit);
      }
    }
    const credits = [...creditsByPerson.values()];

    const tKey = key(title);
    const duplicate = titleKeys.has(tKey) ? "existing" : seenTitles.has(tKey) ? "earlier" : null;
    seenTitles.add(tKey);
    const add = duplicate === null || choices.addDuplicates.has(rec.line);
    rows.push({ line: rec.line, title, credits, rawCells: rec.cells, duplicate, add });

    if (add) {
      for (const c of credits) {
        const map = c.person.isNew ? newPeople : existingPeople;
        const k = key(c.person.name);
        const entry = map.get(k) ?? { name: c.person.name, pieces: [] };
        entry.pieces.push(title);
        map.set(k, entry);
      }
    }
  }

  const usedRoles = new Map<string, boolean>();
  for (const r of rows.filter((r) => r.add))
    for (const c of r.credits) for (const role of c.roles) usedRoles.set(role.role, role.isNew);

  return {
    delimiter,
    columns,
    rows,
    skipped,
    tooMany,
    newPeople: [...newPeople.values()],
    existingPeople: [...existingPeople.values()],
    newRoles: [...usedRoles].filter(([, n]) => n).map(([r]) => r),
    existingRolesUsed: [...usedRoles].filter(([, n]) => !n).map(([r]) => r),
  };
}

/** Example paste mixing real Group data with the tricky cases from the issue. */
export function examplePaste(group: GroupSnapshot): string {
  const p = group.people;
  const t = group.titles;
  const existingA = p[0] ?? "Benny Andersson";
  const existingB = p[1] ?? "Björn Ulvaeus";
  const rows = [
    ["Titel", "Kompositör", "Textförfattare", "Arrangör", "År", "Tonart"],
    ["Sommarpsalm", "Waldemar Åhlén", "Carl David af Wirsén", "", "1933", "D-dur"],
    ["Uti vår hage", "", "", "Hugo Alfvén", "1923", "G-dur"],
    ["Vem kan segla förutan vind", "", "", "Gunnar Eriksson; Anders Åström", "", "e-moll"],
    ["Visa från Utanmyra", "", "", "Jan Johansson; anders aström", "", ""],
    [t[0] ?? "Abendfeier in Venedig", existingA.toLowerCase(), "", "", "", ""],
    ["Kom i min famn", existingA, existingA, existingB, "1979", ""],
    ["Sommarpsalm", "Waldemar Åhlén", "", "", "", ""],
    ["Ave verum corpus", "W. A. Mozart", "", "", "1791", "D-dur"],
    ["", "Okänd", "", "", "", ""],
    ["Härlig är jorden", "Bernhard Severin Ingemann", "", "", "", "", "extra"],
    ["Jag vet en dejlig rosa", "", "", "Hugo Alfvén", "", ""],
  ];
  const tsv = rows.map((r) => r.join("\t")).join("\n");
  return `${tsv}\n\n"Den blomstertid nu kommer\tIsraël Kolmodin\t\t\t1694\t`;
}

export const ROLE_HINT = BUILT_IN_CREDIT_ROLES.join(", ");

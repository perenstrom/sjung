"use client";

// PROTOTYPE — throwaway (PER-417). Three looks for the letter dividers on
// "Alla noter", switchable with ?variant=A|B|C. Not for main.

import { useSearchParams } from "next/navigation";

import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const LETTER_DIVIDER_VARIANTS = [
  { key: "A", name: "Band" },
  { key: "B", name: "Rubrik" },
  { key: "C", name: "Linje" },
] as const;

export type LetterDividerVariant = (typeof LETTER_DIVIDER_VARIANTS)[number]["key"];

export function useLetterDividerVariant(): LetterDividerVariant {
  const value = useSearchParams().get("variant");
  return LETTER_DIVIDER_VARIANTS.some((v) => v.key === value)
    ? (value as LetterDividerVariant)
    : "A";
}

// The Swedish alphabet, in collation order. Matching with a base-sensitivity
// Swedish collator puts every first letter in the group it sorts with:
// É under E, Ü under Y, Æ under Ä, Ø under Ö.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split("");
const collator = new Intl.Collator("sv", { sensitivity: "base" });

/** The letter group a piece name belongs to; "#" for digits and punctuation. */
export function letterGroupKey(name: string): string {
  const first = name.trimStart().charAt(0);
  return ALPHABET.find((letter) => collator.compare(first, letter) === 0) ?? "#";
}

/** The group key to show a divider for before `name`, or null when it continues the previous group. */
export function dividerBefore(name: string, previousName: string | undefined): string | null {
  const key = letterGroupKey(name);
  return previousName !== undefined && letterGroupKey(previousName) === key ? null : key;
}

export function LetterDividerTableRow({
  letter,
  colSpan,
  variant,
}: {
  letter: string;
  colSpan: number;
  variant: LetterDividerVariant;
}) {
  if (variant === "A") {
    return (
      <TableRow className="bg-muted/60 hover:bg-muted/60">
        <TableCell
          colSpan={colSpan}
          className="text-muted-foreground py-1 text-xs font-semibold tracking-wide"
        >
          {letter}
        </TableCell>
      </TableRow>
    );
  }
  if (variant === "B") {
    return (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colSpan} className="pt-8 pb-1 text-xl font-semibold">
          {letter}
        </TableCell>
      </TableRow>
    );
  }
  return (
    <TableRow className="border-b-0 hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-3">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground bg-background rounded-full border px-2.5 py-0.5 text-xs font-semibold">
            {letter}
          </span>
          <span className="bg-border h-px flex-1" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function LetterDividerListItem({
  letter,
  variant,
}: {
  letter: string;
  variant: LetterDividerVariant;
}) {
  return (
    <li
      aria-hidden
      className={cn(
        variant === "A" && "bg-muted/60 text-muted-foreground px-4 py-1 text-xs font-semibold tracking-wide",
        variant === "B" && "px-4 pt-6 pb-1 text-xl font-semibold",
        variant === "C" && "flex items-center gap-3 px-4 py-2"
      )}
    >
      {variant === "C" ? (
        <>
          <span className="text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-semibold">
            {letter}
          </span>
          <span className="bg-border h-px flex-1" />
        </>
      ) : (
        letter
      )}
    </li>
  );
}

// Demo names, in memory only, so there are enough groups to judge the look.
// Mixed with the real pieces; includes the edge cases (digits, quotes,
// accents, Å/Ä/Ö, Ü/Æ/Ø).
const DEMO_NAMES = [
  "Cantique de Jean Racine", "Cent mille chansons", "Con te partirò",
  "Det var på Capri vi mötte varandra", "Have Yourself a Merry Little Christmas",
  "Ave verum corpus", "Bred dina vida vingar", "Dona nobis pacem",
  "Gabriellas sång", "Gläns över sjö och strand", "I denna ljuva sommartid",
  "Jul, jul, strålande jul", "Kärlekens tid", "Lux aurumque", "Missa brevis",
  "Nu tändas tusen juleljus", "O magnum mysterium", "Pie Jesu", "Sommarpsalm",
  "Stilla natt", "Uti vår hage", "Vem kan segla förutan vind", "Den blomstertid nu kommer",
  "Å vad det var roligt", "Änglamark", "Ännu en dag", "Öppna landskap", "Över berg och dal",
  "Élan vital", "Über den Wolken", "Ærlig talt", "Øresund",
  "1700-tals medley", "'Tis the season", "\"Hallelujah\"",
];

export function withDemoPieces<T extends { id: string; name: string }>(pieces: T[]): T[] {
  const template = pieces[0];
  if (!template) return pieces;
  return [
    ...pieces,
    ...DEMO_NAMES.map(
      (name, i) =>
        ({ ...template, id: `demo-${i}`, name, credits: [], files: [], links: [], notes: [] }) as T
    ),
  ];
}

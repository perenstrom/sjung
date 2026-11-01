"use client";

// PROTOTYPE (PER-202): four Medverkande layouts on the piece detail page,
// switchable via ?variant=A|B|C|D. Add and remove hit an in-memory stub, not
// the database, so a reload resets everything. Never merge to main.

import { Plus, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useEditMode } from "@/components/EditModeContext";
import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DUPLICATE_CREDITS_ERROR, sortCreditsForDisplay } from "@/lib/pieces/credits";
import { ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { Person } from "@/types/piece-credit-dialog";

type StubCredit = { personId: string; role: string; person: { name: string } };

type Store = {
  credits: StubCredit[];
  people: Person[];
  add: (personId: string, role: string) => Promise<void>;
  remove: (credit: StubCredit) => Promise<void>;
};

type VariantProps = { store: Store; pieceName: string; readOnly: boolean };

const VARIANTS = [
  { key: "A", name: "Som Länkar: knapp + rad per medverkande" },
  { key: "B", name: "Per person: rollchips" },
  { key: "C", name: "Per roll: lägg till under varje roll" },
  { key: "D", name: "Inline-rad: ingen popover" },
  { key: "D1", name: "D, papperskorg direkt efter rollen" },
  { key: "D2", name: "D, hover-markerad rad + avdelare" },
  { key: "D3", name: "D, smalare lista" },
];

type RowStyle = "far" | "inline" | "hover" | "narrow";
const ROW_STYLES: Record<string, RowStyle> = {
  D: "far",
  D1: "inline",
  D2: "hover",
  D3: "narrow",
};

const EMPTY_COPY = "Inga medverkande tillagda ännu.";
const NO_PEOPLE_TOOLTIP =
  "Inga personer tillagda ännu. Lägg till personer under Personer först.";
const STUB_DELAY_MS = 600;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const creditKey = (credit: { personId: string; role: string }) =>
  `${credit.personId}:${credit.role}`;
const compareSv = (a: string, b: string) => a.localeCompare(b, "sv-SE", { sensitivity: "base" });

export function PieceDetailCreditsPrototype({
  pieceName,
  credits: initialCredits,
  people: realPeople,
}: {
  pieceName: string;
  credits: StubCredit[];
  people: Person[];
}) {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";
  const { isEditing } = useEditMode();

  const [credits, setCredits] = useState(initialCredits);
  const [noPeople, setNoPeople] = useState(false);
  const [failRemoves, setFailRemoves] = useState(false);

  const people = noPeople ? [] : realPeople;

  const store: Store = {
    credits,
    people,
    async add(personId, role) {
      await delay(STUB_DELAY_MS);
      if (credits.some((c) => c.personId === personId && c.role === role)) {
        throw new Error(DUPLICATE_CREDITS_ERROR);
      }
      const name = realPeople.find((p) => p.id === personId)?.name ?? "?";
      setCredits((prev) => [...prev, { personId, role, person: { name } }]);
    },
    async remove(credit) {
      await delay(STUB_DELAY_MS);
      if (failRemoves) throw new Error("Medverkande hittades inte");
      setCredits((prev) => prev.filter((c) => creditKey(c) !== creditKey(credit)));
    },
  };

  const props: VariantProps = { store, pieceName, readOnly: !isEditing };
  // Remount on every edit-mode toggle, like PER-211's sections.
  const key = `${variant}:${isEditing ? "edit" : "read"}`;

  return (
    <>
      {variant === "B" ? (
        <VariantB key={key} {...props} />
      ) : variant === "C" ? (
        <VariantC key={key} {...props} />
      ) : variant in ROW_STYLES ? (
        <VariantD key={key} {...props} rowStyle={ROW_STYLES[variant]} />
      ) : (
        <VariantA key={key} {...props} />
      )}

      <PrototypeSwitcher variants={VARIANTS} current={variant}>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/80">
          <span>
            Stub: {credits.length} medverkande
            {isEditing ? " · redigeringsläge" : " · läsläge"}
          </span>
          <button
            type="button"
            className="underline"
            onClick={() => setCredits(initialCredits)}
          >
            Återställ
          </button>
          <button type="button" className="underline" onClick={() => setCredits([])}>
            Töm
          </button>
          <button
            type="button"
            className="underline"
            onClick={() => setCredits(exampleCredits(realPeople))}
          >
            Exempel
          </button>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={noPeople}
              onChange={(e) => setNoPeople(e.target.checked)}
            />
            Inga personer
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={failRemoves}
              onChange={(e) => setFailRemoves(e.target.checked)}
            />
            Borttagning misslyckas
          </label>
        </div>
      </PrototypeSwitcher>
    </>
  );
}

// A Person with two roles, plus a few single-role Credits, from the real People.
function exampleCredits(people: Person[]): StubCredit[] {
  const pick: [number, string][] = [
    [0, "Kompositör"],
    [0, "Textförfattare"],
    [1, "Arrangör"],
    [2, "Kompositör"],
    [3, "Arrangör"],
  ];
  return pick
    .filter(([i]) => i < people.length)
    .map(([i, role]) => ({
      personId: people[i].id,
      role,
      person: { name: people[i].name },
    }));
}

// ─── Shared bits ────────────────────────────────────────────────────────────

function useRemove(store: Store) {
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function handleRemove(credit: StubCredit) {
    setRemovingKey(creditKey(credit));
    try {
      await store.remove(credit);
      setRemoveError(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Kunde inte ta bort medverkande");
    } finally {
      setRemovingKey(null);
    }
  }

  return { removingKey, removeError, handleRemove };
}

function RemoveError({ message }: { message: string | null }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-input bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
      {role}
    </span>
  );
}

function TrashButton({
  credit,
  disabled,
  onClick,
}: {
  credit: StubCredit;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Ta bort ${credit.person.name} som ${credit.role}`}
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
    </Button>
  );
}

function AddCreditFields({
  store,
  fixedPersonId,
  fixedRole,
  submitLabel = "Lägg till",
  inline = false,
  onAdded,
}: {
  store: Store;
  fixedPersonId?: string;
  fixedRole?: string;
  submitLabel?: string;
  inline?: boolean;
  onAdded?: () => void;
}) {
  const [personId, setPersonId] = useState(fixedPersonId ?? "");
  const [role, setRole] = useState(fixedRole ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // With one side fixed, only offer choices that would not be duplicates.
  const people = fixedRole
    ? store.people.filter(
        (p) => !store.credits.some((c) => c.personId === p.id && c.role === fixedRole)
      )
    : store.people;
  const roles = fixedPersonId
    ? ROLES.filter(
        (r) => !store.credits.some((c) => c.personId === fixedPersonId && c.role === r)
      )
    : ROLES;

  async function submit() {
    if (!personId || !role) {
      setError("Välj person och roll.");
      return;
    }
    setPending(true);
    try {
      await store.add(personId, role);
      setError(null);
      setPersonId(fixedPersonId ?? "");
      setRole(fixedRole ?? "");
      onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte lägga till medverkande");
    } finally {
      setPending(false);
    }
  }

  const personSelect = fixedPersonId ? null : (
    <div className={cn("space-y-2", inline && "min-w-40 flex-1 space-y-0")}>
      {inline ? null : <Label>Person</Label>}
      <Select value={personId} onValueChange={setPersonId} disabled={store.people.length === 0}>
        <SelectTrigger className="w-full" aria-label="Person">
          <SelectValue placeholder={store.people.length === 0 ? "Inga personer" : "Person"} />
        </SelectTrigger>
        <SelectContent>
          {people.map((person) => (
            <SelectItem key={person.id} value={person.id}>
              {person.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const roleSelect = fixedRole ? null : (
    <div className={cn("space-y-2", inline && "min-w-36 space-y-0")}>
      {inline ? null : <Label>Roll</Label>}
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-full" aria-label="Roll">
          <SelectValue placeholder="Roll" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {personSelect}
          {roleSelect}
          <Button
            type="button"
            variant="outline"
            onClick={submit}
            disabled={pending || store.people.length === 0}
          >
            <Plus className="size-4" aria-hidden="true" />
            {pending ? "Lägger till…" : submitLabel}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {personSelect}
        {roleSelect}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Lägger till…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function AddCreditPopover({
  store,
  pieceName,
  title,
  triggerLabel,
  iconAriaLabel = "Lägg till medverkande",
  fixedPersonId,
  fixedRole,
}: {
  store: Store;
  pieceName: string;
  title: string;
  triggerLabel?: string;
  iconAriaLabel?: string;
  fixedPersonId?: string;
  fixedRole?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasPeople = store.people.length > 0;

  const trigger = triggerLabel ? (
    <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={!hasPeople}>
      <Plus className="size-4" aria-hidden="true" />
      {triggerLabel}
    </Button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      disabled={!hasPeople}
      aria-label={iconAriaLabel}
    >
      <Plus className="size-4" aria-hidden="true" />
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {hasPeople ? (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{trigger}</span>
          </TooltipTrigger>
          <TooltipContent side="top">{NO_PEOPLE_TOOLTIP}</TooltipContent>
        </Tooltip>
      )}
      <PopoverContent align="start" className="w-80 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{pieceName}</p>
        </div>
        <AddCreditFields
          store={store}
          fixedPersonId={fixedPersonId}
          fixedRole={fixedRole}
          onAdded={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

function CreditsCard({
  action,
  children,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
        <h2 className="text-lg leading-8 font-medium">Medverkande</h2>
        {action}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

// ─── A: twin of the Länkar card ─────────────────────────────────────────────
// Labelled header button opens a popover; one row per Credit with a trash
// button; one error line under the list; same empty copy in both modes.

function VariantA({ store, pieceName, readOnly }: VariantProps) {
  const { removingKey, removeError, handleRemove } = useRemove(store);
  const sorted = sortCreditsForDisplay(store.credits);

  return (
    <CreditsCard
      action={
        readOnly ? null : (
          <AddCreditPopover
            store={store}
            pieceName={pieceName}
            title="Lägg till medverkande"
            triggerLabel="Lägg till medverkande"
          />
        )
      }
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EMPTY_COPY}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {sorted.map((credit) => (
            <li key={creditKey(credit)} className="flex min-h-7 items-center gap-3">
              <span className="font-medium">{credit.person.name}</span>
              <RoleBadge role={credit.role} />
              {readOnly ? null : (
                <span className="ml-auto">
                  <TrashButton
                    credit={credit}
                    disabled={removingKey === creditKey(credit)}
                    onClick={() => handleRemove(credit)}
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <RemoveError message={removeError} />
    </CreditsCard>
  );
}

// ─── B: grouped per Person ──────────────────────────────────────────────────
// One row per Person with their Credit roles as chips. In edit mode each chip
// gets an ×, and a per-person + adds another role for that Person.

function VariantB({ store, pieceName, readOnly }: VariantProps) {
  const { removingKey, removeError, handleRemove } = useRemove(store);

  const byPerson = new Map<string, StubCredit[]>();
  for (const credit of sortCreditsForDisplay(store.credits)) {
    const list = byPerson.get(credit.personId);
    if (list) list.push(credit);
    else byPerson.set(credit.personId, [credit]);
  }
  const groups = [...byPerson.values()].sort((a, b) =>
    compareSv(a[0].person.name, b[0].person.name)
  );

  return (
    <CreditsCard
      action={
        readOnly ? null : (
          <AddCreditPopover store={store} pieceName={pieceName} title="Lägg till medverkande" />
        )
      }
    >
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EMPTY_COPY}</p>
      ) : (
        <ul className="divide-y text-sm">
          {groups.map((group) => {
            const person = group[0];
            const hasAllRoles = group.length >= ROLES.length;
            return (
              <li key={person.personId} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-40 font-medium">{person.person.name}</span>
                {group.map((credit) => {
                  const pending = removingKey === creditKey(credit);
                  return readOnly ? (
                    <RoleBadge key={credit.role} role={credit.role} />
                  ) : (
                    <span
                      key={credit.role}
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-md border border-input bg-muted/50 py-0.5 pr-0.5 pl-2 text-xs text-muted-foreground",
                        pending && "opacity-50"
                      )}
                    >
                      {credit.role}
                      <button
                        type="button"
                        className="rounded p-0.5 hover:bg-muted hover:text-foreground disabled:pointer-events-none"
                        disabled={pending}
                        onClick={() => handleRemove(credit)}
                        aria-label={`Ta bort ${credit.person.name} som ${credit.role}`}
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
                {readOnly || hasAllRoles ? null : (
                  <AddCreditPopover
                    store={store}
                    pieceName={pieceName}
                    title={`Ny roll för ${person.person.name}`}
                    iconAriaLabel={`Lägg till roll för ${person.person.name}`}
                    fixedPersonId={person.personId}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <RemoveError message={removeError} />
    </CreditsCard>
  );
}

// ─── C: grouped per Credit role ─────────────────────────────────────────────
// Reads like a score's title block. Read mode shows only roles that have
// Credits; edit mode shows every role with its own + (role preset), so there
// is no header button at all.

function VariantC({ store, pieceName, readOnly }: VariantProps) {
  const { removingKey, removeError, handleRemove } = useRemove(store);
  const sorted = sortCreditsForDisplay(store.credits);

  const knownRoles = ROLES as readonly string[];
  const extraRoles = [...new Set(sorted.map((c) => c.role))].filter(
    (r) => !knownRoles.includes(r)
  );
  const roles = [...knownRoles, ...extraRoles].filter(
    (role) => !readOnly || sorted.some((c) => c.role === role)
  );

  return (
    <CreditsCard>
      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EMPTY_COPY}</p>
      ) : (
        <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-6 gap-y-3 text-sm">
          {roles.map((role) => {
            const inRole = sorted.filter((c) => c.role === role);
            return (
              <div key={role} className="contents">
                <dt className="pt-1 text-muted-foreground">{role}</dt>
                <dd className="flex flex-wrap items-center gap-x-1 gap-y-1">
                  {inRole.length === 0 ? (
                    <span className="pt-1 text-muted-foreground/60">—</span>
                  ) : null}
                  {inRole.map((credit, i) => (
                    <span key={credit.personId} className="inline-flex items-center">
                      <span className="font-medium">{credit.person.name}</span>
                      {readOnly ? (
                        i < inRole.length - 1 ? <span>,</span> : null
                      ) : (
                        <TrashButton
                          credit={credit}
                          disabled={removingKey === creditKey(credit)}
                          onClick={() => handleRemove(credit)}
                        />
                      )}
                    </span>
                  ))}
                  {readOnly ? null : (
                    <AddCreditPopover
                      store={store}
                      pieceName={pieceName}
                      title={`Lägg till ${role.toLowerCase()}`}
                      iconAriaLabel={`Lägg till ${role.toLowerCase()}`}
                      fixedRole={role}
                    />
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
      <RemoveError message={removeError} />
    </CreditsCard>
  );
}

// ─── D: inline add row, no popover ──────────────────────────────────────────
// Rows per Credit like A, but edit mode appends a always-visible add row
// (Person + Roll + Lägg till) under the list. Nothing to open.

function VariantD({ store, readOnly, rowStyle }: VariantProps & { rowStyle: RowStyle }) {
  const { removingKey, removeError, handleRemove } = useRemove(store);
  const sorted = sortCreditsForDisplay(store.credits);

  return (
    <CreditsCard>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EMPTY_COPY}</p>
      ) : (
        <ul
          className={cn(
            "text-sm",
            rowStyle === "hover" ? "divide-y" : "space-y-2",
            rowStyle === "narrow" && "max-w-sm"
          )}
        >
          {sorted.map((credit) => (
            <li
              key={creditKey(credit)}
              className={cn(
                "flex min-h-7 items-center gap-3",
                rowStyle === "inline" && "gap-2",
                rowStyle === "hover" && "-mx-2 rounded-md px-2 py-1 hover:bg-muted/60"
              )}
            >
              <span className="font-medium">{credit.person.name}</span>
              <RoleBadge role={credit.role} />
              {readOnly ? null : (
                <span className={cn(rowStyle !== "inline" && "ml-auto")}>
                  <TrashButton
                    credit={credit}
                    disabled={removingKey === creditKey(credit)}
                    onClick={() => handleRemove(credit)}
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <RemoveError message={removeError} />
      {readOnly ? null : (
        <div className="border-t pt-3">
          {store.people.length === 0 ? (
            <p className="mb-2 text-sm text-muted-foreground">{NO_PEOPLE_TOOLTIP}</p>
          ) : null}
          <AddCreditFields store={store} inline />
        </div>
      )}
    </CreditsCard>
  );
}

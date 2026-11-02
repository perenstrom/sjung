"use client";

// PROTOTYPE — throwaway. Three variants of the Claims management UI on the
// members page, switchable via ?variant=. Saving and removing only change
// in-memory state; nothing reaches the server.
import { useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PrototypeSwitcher } from "@/components/prototype/PrototypeSwitcher";

type Claim = "MANAGE_MEMBERS" | "MANAGE_CONTENT";

export type PrototypeMember = {
  id: string;
  name: string;
  email: string;
  claims: Claim[];
};

const CLAIMS: { claim: Claim; label: string; description: string }[] = [
  {
    claim: "MANAGE_MEMBERS",
    label: "Hantera medlemmar",
    description: "Kan lägga till och ta bort medlemmar och ändra andras behörigheter.",
  },
  {
    claim: "MANAGE_CONTENT",
    label: "Hantera innehåll",
    description: "Kan redigera och ta bort allt innehåll i gruppen, även andras.",
  },
];

const VARIANTS = [
  { key: "A", name: "Kolumn + dialog" },
  { key: "B", name: "Kryssrutor i tabellen" },
  { key: "C", name: "Lista + sidopanel" },
];

// Extra members so every state (none / one / both Claims) is visible.
const FAKE_MEMBERS: PrototypeMember[] = [
  { id: "proto-1", name: "Anna Andersson (prototyp)", email: "anna@prototyp.invalid", claims: [] },
  { id: "proto-2", name: "Bertil Berg (prototyp)", email: "bertil@prototyp.invalid", claims: ["MANAGE_MEMBERS"] },
  { id: "proto-3", name: "Cecilia Ek (prototyp)", email: "cecilia@prototyp.invalid", claims: ["MANAGE_CONTENT"] },
  { id: "proto-4", name: "David Dahl (prototyp)", email: "david@prototyp.invalid", claims: ["MANAGE_MEMBERS", "MANAGE_CONTENT"] },
];

type Ctx = {
  members: PrototypeMember[];
  creatorId: string;
  currentUserId: string;
  save: (memberId: string, claims: Claim[]) => Promise<void>;
  remove: (memberId: string) => void;
};

function claimLabel(claim: Claim) {
  return CLAIMS.find((entry) => entry.claim === claim)!.label;
}

function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "admin" }) {
  return (
    <span
      className={
        tone === "admin"
          ? "inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
          : "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
      }
    >
      {children}
    </span>
  );
}

function ClaimPills({ member, creatorId }: { member: PrototypeMember; creatorId: string }) {
  if (member.id === creatorId) {
    return <Pill tone="admin">Administratör</Pill>;
  }
  if (member.claims.length === 0) {
    return <span className="text-muted-foreground">–</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {CLAIMS.filter(({ claim }) => member.claims.includes(claim)).map(({ claim, label }) => (
        <Pill key={claim}>{label}</Pill>
      ))}
    </div>
  );
}

function isEditable(member: PrototypeMember, ctx: Ctx) {
  return member.id !== ctx.creatorId && member.id !== ctx.currentUserId;
}

/* ---------------------------------------------------------------- A ---- */

function ClaimsDialog({
  member,
  ctx,
  onClose,
}: {
  member: PrototypeMember;
  ctx: Ctx;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Claim[]>(member.claims);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    try {
      await ctx.save(member.id, selected);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Behörigheter</DialogTitle>
          <DialogDescription>
            <strong>{member.name}</strong> ({member.email})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {CLAIMS.map(({ claim, label, description }) => (
            <label key={claim} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={selected.includes(claim)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, claim]
                      : current.filter((entry) => entry !== claim)
                  )
                }
              />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-sm text-muted-foreground">{description}</span>
              </span>
            </label>
          ))}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending}>
            Spara
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VariantA({ ctx }: { ctx: Ctx }) {
  const [editing, setEditing] = useState<PrototypeMember | null>(null);

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead>E-post</TableHead>
            <TableHead>Behörigheter</TableHead>
            <TableHead className="w-[100px] text-right">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ctx.members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>{member.name}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <ClaimPills member={member} creatorId={ctx.creatorId} />
              </TableCell>
              <TableCell className="text-right">
                {isEditable(member, ctx) ? (
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setEditing(member)}
                          aria-label={`Behörigheter för ${member.name}`}
                        >
                          <ShieldCheck className="size-4" aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Behörigheter</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => ctx.remove(member.id)}
                          aria-label={`Ta bort ${member.name}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ta bort</TooltipContent>
                    </Tooltip>
                  </div>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editing ? (
        <ClaimsDialog member={editing} ctx={ctx} onClose={() => setEditing(null)} />
      ) : null}
    </TooltipProvider>
  );
}

/* ---------------------------------------------------------------- B ---- */

function VariantB({ ctx }: { ctx: Ctx }) {
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function toggle(member: PrototypeMember, claim: Claim, checked: boolean) {
    const cell = `${member.id}:${claim}`;
    setPendingCell(cell);
    try {
      await ctx.save(
        member.id,
        checked ? [...member.claims, claim] : member.claims.filter((entry) => entry !== claim)
      );
      setErrors(({ [member.id]: _, ...rest }) => rest);
    } catch (err) {
      setErrors((current) => ({ ...current, [member.id]: (err as Error).message }));
    } finally {
      setPendingCell(null);
    }
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead>E-post</TableHead>
            {CLAIMS.map(({ claim, label, description }) => (
              <TableHead key={claim} className="text-center">
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dotted">
                    {label}
                  </TooltipTrigger>
                  <TooltipContent>{description}</TooltipContent>
                </Tooltip>
              </TableHead>
            ))}
            <TableHead className="w-[120px] text-right">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ctx.members.map((member) => {
            const isCreator = member.id === ctx.creatorId;
            const editable = isEditable(member, ctx);
            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {member.name}
                    {isCreator ? <Pill tone="admin">Administratör</Pill> : null}
                  </div>
                  {errors[member.id] ? (
                    <p className="text-xs text-destructive">{errors[member.id]}</p>
                  ) : null}
                </TableCell>
                <TableCell>{member.email}</TableCell>
                {CLAIMS.map(({ claim }) => (
                  <TableCell key={claim} className="text-center">
                    <input
                      type="checkbox"
                      className="size-4 disabled:opacity-50"
                      aria-label={`${claimLabel(claim)} för ${member.name}`}
                      checked={isCreator || member.claims.includes(claim)}
                      disabled={!editable || pendingCell === `${member.id}:${claim}`}
                      onChange={(event) => toggle(member, claim, event.target.checked)}
                    />
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {editable ? (
                    <Button variant="destructive" size="sm" onClick={() => ctx.remove(member.id)}>
                      Ta bort
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

/* ---------------------------------------------------------------- C ---- */

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => /^\p{L}/u.test(part))
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function MemberSheet({
  member,
  ctx,
  onClose,
}: {
  member: PrototypeMember;
  ctx: Ctx;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Claim[]>(member.claims);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isCreator = member.id === ctx.creatorId;
  const isSelf = member.id === ctx.currentUserId;
  const editable = isEditable(member, ctx);
  const dirty =
    selected.length !== member.claims.length ||
    selected.some((claim) => !member.claims.includes(claim));

  async function handleSave() {
    setPending(true);
    try {
      await ctx.save(member.id, selected);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0">
        <SheetHeader>
          <SheetTitle>{member.name}</SheetTitle>
          <SheetDescription>{member.email}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          <h3 className="text-sm font-semibold">Behörigheter</h3>
          {isCreator ? (
            <p className="text-sm text-muted-foreground">
              Gruppens administratör har alltid alla behörigheter och kan inte ändras.
            </p>
          ) : isSelf ? (
            <p className="text-sm text-muted-foreground">Du kan inte ändra dina egna behörigheter.</p>
          ) : null}
          {CLAIMS.map(({ claim, label, description }) => {
            const on = isCreator || selected.includes(claim);
            return (
              <div key={claim} className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-sm text-muted-foreground">{description}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={label}
                  disabled={!editable}
                  onClick={() =>
                    setSelected((current) =>
                      on ? current.filter((entry) => entry !== claim) : [...current, claim]
                    )
                  }
                  className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                    on ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-background transition-all ${
                      on ? "left-[1.125rem]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            );
          })}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {editable ? (
            <div className="mt-8 space-y-2 border-t pt-4">
              <h3 className="text-sm font-semibold text-destructive">Ta bort ur gruppen</h3>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  ctx.remove(member.id);
                  onClose();
                }}
              >
                Ta bort medlem
              </Button>
            </div>
          ) : null}
        </div>
        {editable ? (
          <SheetFooter className="flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="button" onClick={handleSave} disabled={!dirty || pending}>
              Spara
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function VariantC({ ctx }: { ctx: Ctx }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = ctx.members.find((member) => member.id === openId) ?? null;

  return (
    <>
      <ul className="divide-y rounded-md border">
        {ctx.members.map((member) => {
          const isCreator = member.id === ctx.creatorId;
          const summary = isCreator
            ? "Administratör"
            : member.claims.length === 0
              ? "Medlem"
              : member.claims.map(claimLabel).join(" · ");
          return (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => setOpenId(member.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {initials(member.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {member.name}
                    {member.id === ctx.currentUserId ? (
                      <span className="ml-2 text-xs text-muted-foreground">(du)</span>
                    ) : null}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">{member.email}</span>
                </span>
                <span
                  className={`hidden text-sm sm:block ${
                    isCreator ? "font-medium" : "text-muted-foreground"
                  }`}
                >
                  {summary}
                </span>
                <span aria-hidden className="text-muted-foreground">
                  ›
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {open ? <MemberSheet key={open.id} member={open} ctx={ctx} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}

/* ---------------------------------------------------------- switcher ---- */

export function ClaimsManagementPrototype({
  initialMembers,
  creatorId,
  currentUserId,
  variant,
}: {
  initialMembers: PrototypeMember[];
  creatorId: string;
  currentUserId: string;
  variant: string;
}) {
  const [members, setMembers] = useState<PrototypeMember[]>(() =>
    [...initialMembers, ...FAKE_MEMBERS].sort((a, b) => a.name.localeCompare(b.name, "sv"))
  );
  const [simulateError, setSimulateError] = useState(false);
  const [lastAction, setLastAction] = useState<string>("–");

  const ctx: Ctx = {
    members,
    creatorId,
    currentUserId,
    async save(memberId, claims) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (simulateError) {
        setLastAction(`save(${memberId}) → fel`);
        throw new Error("Kunde inte spara behörigheter (simulerat fel)");
      }
      setMembers((current) =>
        current.map((member) => (member.id === memberId ? { ...member, claims } : member))
      );
      setLastAction(`setMemberClaims(${memberId}, [${claims.join(", ")}])`);
    },
    remove(memberId) {
      if (!window.confirm("Ta bort medlem? (prototyp – påverkar bara sidan)")) return;
      setMembers((current) => current.filter((member) => member.id !== memberId));
      setLastAction(`removeMember(${memberId})`);
    },
  };

  const current = VARIANTS.some((entry) => entry.key === variant) ? variant : "A";

  return (
    <div className="pb-24">
      {current === "A" && <VariantA ctx={ctx} />}
      {current === "B" && <VariantB ctx={ctx} />}
      {current === "C" && <VariantC ctx={ctx} />}

      <details className="mt-8 rounded-md border border-dashed border-fuchsia-500 p-3 text-xs">
        <summary className="cursor-pointer font-mono">PROTOTYP – tillstånd</summary>
        <label className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={simulateError}
            onChange={(event) => setSimulateError(event.target.checked)}
          />
          Simulera serverfel vid spara
        </label>
        <p className="mt-2 font-mono">Senaste åtgärd: {lastAction}</p>
        <pre className="mt-2 overflow-x-auto font-mono">
          {JSON.stringify(
            {
              creatorId,
              currentUserId,
              members: members.map(({ id, name, claims }) => ({ id, name, claims })),
            },
            null,
            2
          )}
        </pre>
      </details>

      <PrototypeSwitcher variants={VARIANTS} current={current} />
    </div>
  );
}

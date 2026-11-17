"use client";

// PROTOTYPE (PER-434) — throwaway. Three variants of the Piece import preview,
// mounted on the existing Alla noter page and switchable via `?variant=A|B|C`
// and the floating bar. Nothing is saved: "Importera" only shows the summary.
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PrototypeSwitcher } from "@/components/prototype/PrototypeSwitcher";
import { Button } from "@/components/ui/button";
import type { GroupSnapshot } from "./parse";
import { useImportState } from "./shared";
import { VariantA } from "./VariantA";
import { VariantB } from "./VariantB";
import { VariantC } from "./VariantC";

const VARIANTS = [
  { key: "A", name: "Dialog i steg" },
  { key: "B", name: "Kalkylark på sidan" },
  { key: "C", name: "Granska per typ" },
];

export function PieceImportPrototype({
  people,
  roles,
  titles,
  createAction,
  children,
}: {
  people: string[];
  roles: string[];
  titles: string[];
  createAction: React.ReactNode;
  children: React.ReactNode;
}) {
  const variant = useSearchParams().get("variant") ?? "A";
  const group: GroupSnapshot = useMemo(() => ({ people, roles, titles }), [people, roles, titles]);
  const state = useImportState(group);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Alla noter"
        editActions={
          <>
            {createAction}
            <Button variant="outline" onClick={() => setOpen(true)}>
              Importera
            </Button>
          </>
        }
      />

      {variant === "B" && open ? <VariantB state={state} onClose={() => setOpen(false)} /> : children}
      {variant === "A" ? <VariantA state={state} open={open} onOpenChange={setOpen} /> : null}
      {variant === "C" ? <VariantC state={state} open={open} onOpenChange={setOpen} /> : null}

      <PrototypeSwitcher variants={VARIANTS} />
    </>
  );
}

"use client";

import { useId } from "react";
import type { GroupClaim } from "@/app/generated/prisma/enums";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GROUP_CLAIM_OPTIONS } from "@/lib/group-claims";

/**
 * Every Claim as a labelled checkbox, ticked for those in `selected`, and the
 * selection as repeated hidden `claims` fields for the surrounding form.
 */
export function ClaimCheckboxList({
  selected,
  onSelectedChange,
  disabled,
  notes,
}: {
  selected: readonly GroupClaim[];
  onSelectedChange: (next: GroupClaim[]) => void;
  disabled?: boolean;
  /** An extra line under a Claim's description, such as where else the Member gets it from. */
  notes?: Partial<Record<GroupClaim, string>>;
}) {
  const idPrefix = useId();

  function toggleClaim(claim: GroupClaim, checked: boolean) {
    onSelectedChange(checked ? [...selected, claim] : selected.filter((entry) => entry !== claim));
  }

  return (
    <div className="space-y-4">
      {selected.map((claim) => (
        <input key={claim} type="hidden" name="claims" value={claim} />
      ))}
      {GROUP_CLAIM_OPTIONS.map(({ claim, label, description }) => {
        const checkboxId = `${idPrefix}-${claim}`;
        const note = notes?.[claim];
        return (
          <div key={claim} className="flex items-start gap-3">
            <Checkbox
              id={checkboxId}
              className="mt-0.5"
              checked={selected.includes(claim)}
              onCheckedChange={(checked) => toggleClaim(claim, checked === true)}
              disabled={disabled}
              aria-describedby={`${checkboxId}-description`}
            />
            <div className="space-y-1">
              <Label htmlFor={checkboxId}>{label}</Label>
              <p id={`${checkboxId}-description`} className="text-sm text-muted-foreground">
                {description}
                {note ? <span className="block">{note}</span> : null}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

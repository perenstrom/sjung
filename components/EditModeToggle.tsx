"use client";

import { Pencil } from "lucide-react";

import { useEditMode } from "@/components/EditModeContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EditModeToggle() {
  const { isEditing, setIsEditing } = useEditMode();

  return (
    <Button
      type="button"
      variant={isEditing ? "default" : "outline"}
      // Match the outline variant's border so switching variants keeps the width.
      className={cn(isEditing && "border border-transparent")}
      aria-pressed={isEditing}
      aria-label={isEditing ? "Klar" : "Redigera"}
      onClick={() => setIsEditing(!isEditing)}
    >
      {/* Both labels share one grid cell so the button keeps the wider one's width. */}
      <span className="grid">
        <span
          className={cn(
            "col-start-1 row-start-1 inline-flex items-center gap-2",
            isEditing && "invisible"
          )}
        >
          <Pencil aria-hidden="true" />
          Redigera
        </span>
        <span
          className={cn("col-start-1 row-start-1 text-center", !isEditing && "invisible")}
        >
          Klar
        </span>
      </span>
    </Button>
  );
}

"use client";

import { Pencil } from "lucide-react";

import { useEditMode } from "@/components/EditModeContext";
import { Button } from "@/components/ui/button";

export function EditModeToggle() {
  const { isEditing, setIsEditing } = useEditMode();

  return (
    <Button
      type="button"
      variant={isEditing ? "default" : "outline"}
      size="sm"
      aria-pressed={isEditing}
      onClick={() => setIsEditing(!isEditing)}
    >
      {isEditing ? (
        "Klar"
      ) : (
        <>
          <Pencil aria-hidden="true" />
          Redigera
        </>
      )}
    </Button>
  );
}

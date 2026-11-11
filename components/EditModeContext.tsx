"use client";

import { createContext, useContext, useMemo, useState } from "react";

type EditModeContextValue = {
  /** Whether the Member may turn edit mode on at all. */
  canEdit: boolean;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
};

const EditModeContext = createContext<EditModeContextValue | null>(null);

/**
 * Per-page edit mode. Lives only in component state, so every page opens
 * read-only and a reload or navigation drops back to it, while a refresh after
 * a server action keeps it. `canEdit` is decided on the server from the
 * Member's Group access: without it edit mode never turns on. The server still
 * enforces the permission on every change; this only hides what would fail.
 */
export function EditModeProvider({
  canEdit,
  children,
}: Readonly<{ canEdit: boolean; children: React.ReactNode }>) {
  const [isEditingState, setIsEditing] = useState(false);
  const isEditing = canEdit && isEditingState;

  const value = useMemo<EditModeContextValue>(
    () => ({ canEdit, isEditing, setIsEditing }),
    [canEdit, isEditing]
  );

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error("useEditMode must be used within EditModeProvider");
  }
  return context;
}

/**
 * Renders its children only in edit mode. Leaving edit mode unmounts them,
 * which throws away any unsaved input.
 */
export function EditOnly({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isEditing } = useEditMode();
  return isEditing ? children : null;
}

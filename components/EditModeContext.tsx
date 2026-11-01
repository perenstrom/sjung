"use client";

import { createContext, useContext, useMemo, useState } from "react";

type EditModeContextValue = {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
};

const EditModeContext = createContext<EditModeContextValue | null>(null);

/**
 * Per-page edit mode. Lives only in component state, so every page opens
 * read-only and a reload or navigation drops back to it, while a refresh after
 * a server action keeps it. Edit mode is a convenience, not a permission.
 */
export function EditModeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isEditing, setIsEditing] = useState(false);

  const value = useMemo<EditModeContextValue>(
    () => ({ isEditing, setIsEditing }),
    [isEditing]
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

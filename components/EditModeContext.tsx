"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { EditCapability } from "@/lib/edit-mode";

type EditModeContextValue = {
  /** The capabilities that matter on the page and that the Member holds. */
  capabilities: readonly EditCapability[];
  /** Whether Edit mode is on. Controls ask `useEditMode` instead, which checks their capability too. */
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
};

const EditModeContext = createContext<EditModeContextValue | null>(null);

/** What an edit control needs unless it says otherwise. */
const MANAGE_CONTENT: readonly EditCapability[] = ["manageContent"];

/**
 * Per-page edit mode. Lives only in component state, so every page opens
 * read-only and a reload or navigation drops back to it, while a refresh after
 * a server action keeps it. `capabilities` is decided on the server from the
 * Member's Group access (see `heldEditCapabilities`): Edit mode is offered when
 * it holds any, and each control inside shows only with the capability it
 * needs (ADR-0012). The server still enforces the permission on every change;
 * this only hides what would fail.
 */
export function EditModeProvider({
  capabilities,
  children,
}: Readonly<{ capabilities: readonly EditCapability[]; children?: React.ReactNode }>) {
  const [isEditingState, setIsEditing] = useState(false);
  const isEditing = capabilities.length > 0 && isEditingState;

  const value = useMemo<EditModeContextValue>(
    () => ({ capabilities, isEditing, setIsEditing }),
    [capabilities, isEditing],
  );

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

function useEditModeContext() {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error("Edit mode hooks must be used within EditModeProvider");
  }
  return context;
}

/**
 * Edit mode for a control that needs any of `anyOf` (by default
 * `manageContent`): `canEdit` when the Member holds one, and `isEditing` only
 * while Edit mode is on and they do.
 */
export function useEditMode(anyOf: readonly EditCapability[] = MANAGE_CONTENT) {
  const { capabilities, isEditing, setIsEditing } = useEditModeContext();
  const canEdit = anyOf.some((capability) => capabilities.includes(capability));
  return { canEdit, isEditing: canEdit && isEditing, setIsEditing };
}

/** For the Redigera/Klar toggle: offered when the Member holds any capability that matters on the page. */
export function useEditModeToggle() {
  const { capabilities, isEditing, setIsEditing } = useEditModeContext();
  return { isOffered: capabilities.length > 0, isEditing, setIsEditing };
}

/**
 * Renders its children only in edit mode, for a Member holding any of `anyOf`
 * (by default `manageContent`). Leaving edit mode unmounts them, which throws
 * away any unsaved input.
 */
export function EditOnly({
  anyOf,
  children,
}: Readonly<{ anyOf?: readonly EditCapability[]; children?: React.ReactNode }>) {
  const { isEditing } = useEditMode(anyOf);
  return isEditing ? children : null;
}

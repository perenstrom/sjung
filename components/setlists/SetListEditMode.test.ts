// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditModeProvider, EditOnly } from "@/components/EditModeContext";
import { PageHeader } from "@/components/PageHeader";
import { PiecesTable } from "@/components/pieces/PiecesTable";
import type { EditCapability } from "@/lib/edit-mode";
import type { PieceWithRelations } from "@/lib/pieces/types";
import type { SetListStep } from "@/lib/setlists/types";

// The dialogs, popovers and step actions import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/people", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("@/app/actions/setlists", () => ({
  deleteSetListNote: vi.fn(),
  reorderSetListSteps: vi.fn(),
  removePieceFromSetList: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const piece = {
  id: "piece-1",
  slug: "vem-kan-segla",
  name: "Vem kan segla",
  credits: [],
  aliases: [],
  files: [],
  links: [],
  notes: [],
} as unknown as PieceWithRelations;

const steps = [
  { kind: "piece", id: "step-1", position: 0, piece },
  { kind: "note", id: "step-2", position: 1, content: "Paus" },
] as unknown as SetListStep[];

/** The Set list page's edit surface: header with toggle, the running order and an edit-only form. */
function setListPage(capabilities: EditCapability[]) {
  return createElement(
    EditModeProvider,
    { capabilities },
    createElement(PageHeader, { title: "Julkonsert" }),
    createElement(PiecesTable, { people: [], creditRoles: [], groupSlug: "koren", setList: { id: "sl-1", steps } }),
    createElement(EditOnly, null, "Lägg till anteckning"),
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(capabilities: EditCapability[]) {
  act(() => root.render(setListPage(capabilities)));
}

function toggle(): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>('button[aria-label="Redigera"]');
}

function turnOnEditMode() {
  act(() => toggle()!.click());
}

describe("Edit mode on a Set list", () => {
  it("lets a reorder-only Member turn on Edit mode and shows only the move buttons", () => {
    render(["reorderSetLists"]);
    turnOnEditMode();

    const text = container.textContent ?? "";
    expect(text).toContain("Flytta upp");
    expect(text).toContain("Flytta ner");
    expect(text).not.toContain("Ta bort");
    expect(text).not.toContain("Lägg till anteckning");
    expect(container.querySelector('[aria-label="Lägg till upphovsperson"]')).toBeNull();
    expect(container.querySelector('[aria-label^="Byt namn"]')).toBeNull();
  });

  it("offers no Edit toggle to a Member with no capability that matters on the page", () => {
    render([]);

    expect(toggle()).toBeNull();
  });
});

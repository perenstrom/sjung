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
  updateSetListNote: vi.fn(async () => {}),
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

// A piece row's content controls need `matchMedia`, which jsdom lacks, so the
// content-manager tests show only the note.
const noteOnly = steps.filter((step) => step.kind === "note");

/** The Set list page's edit surface: header with toggle, the running order and an edit-only form. */
function setListPage(capabilities: EditCapability[], shownSteps: SetListStep[]) {
  return createElement(
    EditModeProvider,
    { capabilities },
    createElement(PageHeader, { title: "Julkonsert" }),
    createElement(PiecesTable, {
      people: [],
      creditRoles: [],
      groupSlug: "koren",
      setList: { id: "sl-1", steps: shownSteps },
    }),
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

function render(capabilities: EditCapability[], shownSteps = steps) {
  act(() => root.render(setListPage(capabilities, shownSteps)));
}

function toggle(): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>('button[aria-label="Redigera"]');
}

function turnOnEditMode() {
  act(() => toggle()!.click());
}

const EDIT_NOTE = "Redigera anteckning";

/** The table and the phone list both render the running order, so each control is there twice. */
function buttonsNamed(name: string): HTMLButtonElement[] {
  return [...container.querySelectorAll("button")].filter((button) => button.textContent?.trim() === name);
}

function noteEditors(): HTMLTextAreaElement[] {
  return [...container.querySelectorAll("textarea")];
}

function typeInto(textarea: HTMLTextAreaElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    setValue.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("Edit mode on a Set list", () => {
  it("lets a reorder-only Member turn on Edit mode and shows only the move buttons", () => {
    render(["reorderSetLists"]);
    turnOnEditMode();

    const text = container.textContent ?? "";
    expect(text).toContain("Flytta upp");
    expect(text).toContain("Flytta ner");
    expect(text).not.toContain("Ta bort");
    expect(buttonsNamed(EDIT_NOTE)).toEqual([]);
    expect(text).not.toContain("Lägg till anteckning");
    expect(container.querySelector('[aria-label="Lägg till upphovsperson"]')).toBeNull();
    expect(container.querySelector('[aria-label^="Byt namn"]')).toBeNull();
  });

  it("offers no Edit toggle to a Member with no capability that matters on the page", () => {
    render([]);

    expect(toggle()).toBeNull();
  });

  it("lets a content manager edit a Running-order note's text, and Avbryt keeps the old text", () => {
    render(["manageContent"], noteOnly);
    turnOnEditMode();

    act(() => buttonsNamed(EDIT_NOTE)[0].click());
    const [editor] = noteEditors();
    expect(editor.value).toBe("Paus");

    typeInto(editor, "Paus, tio minuter");
    act(() => buttonsNamed("Avbryt")[0].click());

    expect(noteEditors()).toEqual([]);
    expect(container.textContent).toContain("Paus");
    expect(container.textContent).not.toContain("tio minuter");
  });

  it("shows a Running-order note's new text after Spara", async () => {
    render(["manageContent"], noteOnly);
    turnOnEditMode();

    act(() => buttonsNamed(EDIT_NOTE)[0].click());
    typeInto(noteEditors()[0], "Paus, tio minuter");
    await act(async () => buttonsNamed("Spara")[0].click());

    expect(noteEditors()).toEqual([]);
    expect(container.textContent).toContain("Paus, tio minuter");
  });

  it("closes a Running-order note's editor when Edit mode is turned off", () => {
    render(["manageContent"], noteOnly);
    turnOnEditMode();
    act(() => buttonsNamed(EDIT_NOTE)[0].click());

    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Klar"]')!.click());
    expect(noteEditors()).toEqual([]);

    turnOnEditMode();
    expect(noteEditors()).toEqual([]);
  });
});

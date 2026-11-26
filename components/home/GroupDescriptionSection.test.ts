// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditModeProvider } from "@/components/EditModeContext";
import { PageHeader } from "@/components/PageHeader";
import { GroupDescriptionSection } from "@/components/home/GroupDescriptionSection";
import type { EditCapability } from "@/lib/edit-mode";

// The edit dialog imports the server action, which reaches the database.
vi.mock("@/app/actions/groups", () => ({ setGroupDescription: vi.fn() }));

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
  vi.restoreAllMocks();
});

/** Home's header and description, as the page puts them together. */
function render(description: string | null, capabilities: EditCapability[] = []) {
  act(() =>
    root.render(
      createElement(
        EditModeProvider,
        { capabilities },
        createElement(PageHeader, { title: "Hem" }),
        createElement(GroupDescriptionSection, { groupSlug: "koren", description }),
      ),
    ),
  );
}

function button(name: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === name);
}

function turnOnEditMode() {
  act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Redigera"]')!.click());
}

/** Makes every element report more content than fits, as a long description does below `md`. */
function overflowEverything() {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
}

describe("GroupDescriptionSection", () => {
  it("renders the description's Markdown, with no heading of its own", () => {
    render("Vi repar **tisdagar**.");

    expect(container.querySelector("strong")?.textContent).toBe("tisdagar");
    expect(container.querySelectorAll("h2")).toHaveLength(0);
    expect(button("Visa mer")).toBeUndefined();
  });

  it("renders nothing without a description outside Edit mode", () => {
    render(null, ["manageGroupHome"]);

    expect(container.querySelector("section")).toBeNull();
  });

  it("offers a holder the Edit mode toggle, and in it a way to write the first description", () => {
    render(null, ["manageGroupHome"]);
    turnOnEditMode();

    expect(container.textContent).toContain("Ingen beskrivning än");
    expect(button("Redigera beskrivning")).toBeDefined();
  });

  it("shows the description and its edit button to a holder in Edit mode", () => {
    render("Vi repar tisdagar.", ["manageGroupHome"]);
    turnOnEditMode();

    expect(container.textContent).toContain("Vi repar tisdagar.");
    expect(container.textContent).not.toContain("Ingen beskrivning än");
    expect(button("Redigera beskrivning")).toBeDefined();
  });

  it("offers no Edit mode toggle to a Member who can't change the description", () => {
    render("Vi repar tisdagar.");

    expect(container.querySelector('button[aria-label="Redigera"]')).toBeNull();
    expect(button("Redigera beskrivning")).toBeUndefined();
  });

  it("collapses a description that overflows behind Visa mer, which toggles to Visa mindre", () => {
    overflowEverything();
    render("Rad ett\n\nRad två\n\nRad tre\n\nRad fyra\n\nRad fem");

    act(() => button("Visa mer")!.click());
    expect(button("Visa mer")).toBeUndefined();

    act(() => button("Visa mindre")!.click());
    expect(button("Visa mer")).toBeDefined();
  });
});

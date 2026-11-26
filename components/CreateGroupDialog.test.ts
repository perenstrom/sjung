// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreateGroupDialog } from "@/components/CreateGroupDialog";

// The dialog imports the server action, which reaches the database.
vi.mock("@/app/actions/groups", () => ({ createGroup: vi.fn() }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // Radix's Checkbox measures itself; jsdom has no ResizeObserver.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(createElement(CreateGroupDialog)));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

/** A button anywhere on the page, the dialog's portal included. */
function button(name: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === name);
}

function openDialog() {
  act(() => button("Vill du starta en egen grupp?")!.click());
}

function confirmation(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('[role="checkbox"]')!;
}

describe("CreateGroupDialog", () => {
  it("explains what a Group is before asking for its name", () => {
    openDialog();
    const dialog = document.querySelector('[role="dialog"]')!.textContent!;

    expect(dialog).toContain("Du blir gruppens administratör och ansvarar för den.");
    expect(dialog).toContain("Vill du gå med i en grupp som redan finns?");
    expect(dialog.indexOf("Vill du gå med")).toBeLessThan(dialog.indexOf("Gruppnamn"));
  });

  it("keeps Skapa disabled until the user confirms they become the new Group's administratör", () => {
    openDialog();
    expect(button("Skapa")!.disabled).toBe(true);

    act(() => confirmation().click());
    expect(button("Skapa")!.disabled).toBe(false);
  });

  it("asks for the confirmation again each time it opens", () => {
    openDialog();
    act(() => confirmation().click());
    act(() => button("Close")!.click());

    openDialog();
    expect(confirmation().getAttribute("aria-checked")).toBe("false");
    expect(button("Skapa")!.disabled).toBe(true);
  });
});

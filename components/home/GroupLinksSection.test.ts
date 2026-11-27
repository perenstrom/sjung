// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditModeProvider } from "@/components/EditModeContext";
import { PageHeader } from "@/components/PageHeader";
import { GroupLinksSection } from "@/components/home/GroupLinksSection";
import type { EditCapability } from "@/lib/edit-mode";
import { hasLink, textOf } from "@/lib/testing/markup";

// The dialogs import the server actions, which reach the database.
vi.mock("@/app/actions/group-links", () => ({
  addGroupLink: vi.fn(),
  updateGroupLink: vi.fn(),
  removeGroupLink: vi.fn(),
}));

const LINKS = [
  { id: "1", label: "Kalender", url: "https://calendar.google.com/calendar?cid=1" },
  { id: "2", label: "Swish för terminsavgift", url: "https://www.swish.nu/betala" },
];

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

/** Home's header and links, as the page puts them together. */
function render(links: typeof LINKS, capabilities: EditCapability[] = []) {
  act(() =>
    root.render(
      createElement(
        EditModeProvider,
        { capabilities },
        createElement(PageHeader, { title: "Kören" }),
        createElement(GroupLinksSection, { groupSlug: "koren", links }),
      ),
    ),
  );
}

function buttons(name: string): HTMLButtonElement[] {
  return [...container.querySelectorAll("button")].filter((candidate) => candidate.textContent?.trim() === name);
}

function turnOnEditMode() {
  act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Redigera"]')!.click());
}

describe("GroupLinksSection", () => {
  it("lists each link under Länkar with its host, opening in a new tab", () => {
    render(LINKS);

    const text = textOf(container.innerHTML);
    for (const shown of ["Länkar", "Kalender", "calendar.google.com", "Swish för terminsavgift", "swish.nu"]) {
      expect(text).toContain(shown);
    }
    expect(hasLink(container.innerHTML, LINKS[1]!.url, "Swish för terminsavgift")).toBe(true);
    expect(container.querySelector<HTMLAnchorElement>("a")?.target).toBe("_blank");
  });

  it("renders nothing without links outside Edit mode", () => {
    render([], ["manageGroupHome"]);

    expect(textOf(container.innerHTML)).not.toContain("Länkar");
  });

  it("offers a holder in Edit mode Lägg till länk, and Redigera and Ta bort on each link", () => {
    render([], ["manageGroupHome"]);
    turnOnEditMode();
    expect(textOf(container.innerHTML)).toContain("Länkar");
    expect(buttons("Lägg till länk")).toHaveLength(1);

    render(LINKS, ["manageGroupHome"]);
    expect(buttons("Redigera")).toHaveLength(2);
    expect(buttons("Ta bort")).toHaveLength(2);
  });

  it("offers no edit controls to a Member who can't change the links", () => {
    render(LINKS);

    expect(container.querySelector('button[aria-label="Redigera"]')).toBeNull();
    expect(buttons("Lägg till länk")).toHaveLength(0);
  });
});

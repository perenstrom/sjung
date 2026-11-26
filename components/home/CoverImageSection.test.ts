// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditModeProvider } from "@/components/EditModeContext";
import { PageHeader } from "@/components/PageHeader";
import { CoverImageSection } from "@/components/home/CoverImageSection";
import type { EditCapability } from "@/lib/edit-mode";

// The dialogs import the server actions, which reach the database.
vi.mock("@/app/actions/groups", () => ({
  createGroupCoverImageUploadUrl: vi.fn(),
  setGroupCoverImage: vi.fn(),
  removeGroupCoverImage: vi.fn(),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no `matchMedia`; asking for reduced motion keeps the parallax off.
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function render(href: string | null, capabilities: EditCapability[] = []) {
  act(() =>
    root.render(
      createElement(
        EditModeProvider,
        { capabilities },
        createElement(CoverImageSection, { groupSlug: "koren", href }),
        createElement(PageHeader, { title: "Hem" }),
      ),
    ),
  );
}

function buttonNames(): string[] {
  return [...container.querySelectorAll("button")].map((button) => button.textContent?.trim() ?? "");
}

function turnOnEditMode() {
  act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Redigera"]')!.click());
}

describe("CoverImageSection", () => {
  it("shows the image first on Home, as decoration with empty alt text", () => {
    render("/app/koren/cover-image?v=abc");

    const image = container.querySelector("img")!;
    expect(image.getAttribute("src")).toBe("/app/koren/cover-image?v=abc");
    expect(image.getAttribute("alt")).toBe("");
    expect(container.firstElementChild?.contains(image)).toBe(true);
  });

  it("leaves no empty frame without an image, even in Edit mode", () => {
    render(null, ["manageGroupHome"]);
    turnOnEditMode();

    expect(container.querySelector("section")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("offers a holder Byt and Ta bort omslagsbild in Edit mode only", () => {
    render("/app/koren/cover-image?v=abc", ["manageGroupHome"]);
    expect(buttonNames()).not.toContain("Byt omslagsbild");

    turnOnEditMode();

    expect(buttonNames()).toEqual(expect.arrayContaining(["Byt omslagsbild", "Ta bort omslagsbild"]));
  });

  it("offers a Member holding only manageContent no actions, even in Edit mode", () => {
    render("/app/koren/cover-image?v=abc", ["manageContent"]);
    turnOnEditMode();

    expect(buttonNames()).not.toContain("Byt omslagsbild");
    expect(buttonNames()).not.toContain("Ta bort omslagsbild");
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { textOf } from "@/lib/testing/markup";

import { PieceInlineFilesAndLinksCell } from "./PieceInlineFilesAndLinksCell";

// The lists and popovers import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("@/app/actions/pieces", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function render(
  readOnly: boolean,
  categories: { file?: string; link?: string; otherFile?: string } = {},
): string {
  return renderToStaticMarkup(
    createElement(PieceInlineFilesAndLinksCell, {
      readOnly,
      groupSlug: "kören",
      pieceId: "piece-1",
      pieceName: "Vem kan segla",
      files: [
        { id: "file-1", displayName: "Sopran_stämma_REVIDERAD.pdf", size: 1024, category: categories.file ?? null },
        ...(categories.otherFile === undefined
          ? []
          : [{ id: "file-2", displayName: "Alt.pdf", size: 1024, category: categories.otherFile }]),
      ],
      links: [{ id: "link-1", url: "https://example.com/inspelning", label: "Inspelning", category: categories.link ?? null }],
    }),
  );
}

describe("PieceInlineFilesAndLinksCell", () => {
  it("lists files before links", () => {
    const html = render(true);
    expect(html.indexOf("Sopran_stämma_REV")).toBeGreaterThan(-1);
    expect(html.indexOf("Sopran_stämma_REV")).toBeLessThan(html.indexOf("Inspelning"));
  });

  it("keeps the end of a long file name in its own part, which never shrinks", () => {
    expect(render(true)).toMatch(/>Sopran_stämma_REV<\/span><span[^>]*shrink-0[^>]*>IDERAD\.pdf</);
  });

  it("has no add buttons when read-only", () => {
    const html = render(true);
    expect(html).not.toContain("Ladda upp fil");
    expect(html).not.toContain("Lägg till länk");
  });

  it("keeps an add button for each list in edit mode, files first", () => {
    const html = render(false);
    expect(html.indexOf("Ladda upp fil")).toBeGreaterThan(-1);
    expect(html.indexOf("Ladda upp fil")).toBeLessThan(html.indexOf("Lägg till länk"));
  });

  it("shows no Category headings when nothing has a Category", () => {
    expect(textOf(render(true))).not.toContain("Övrigt");
  });

  it("groups under Categories in ranking order, Files before Links, Övrigt last", () => {
    const text = textOf(render(true, { file: "Inspelningar", link: "Inspelningar", otherFile: "Noter" }));
    expect(text).toMatch(/Noter.*Alt\.pdf.*Inspelningar.*Sopran.*Inspelning(?!ar)/);
  });

  it("puts the uncategorized under Övrigt, after the Categories", () => {
    expect(textOf(render(true, { link: "Noter" }))).toMatch(/Noter.*Inspelning.*Övrigt.*Sopran/);
  });

  it("keeps an add button for each list in edit mode when grouped", () => {
    const html = render(false, { file: "Noter" });
    expect(html).toContain("Ladda upp fil");
    expect(html).toContain("Lägg till länk");
  });
});

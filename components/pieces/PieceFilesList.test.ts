import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { fileDownloadHref } from "@/lib/pieces/href";
import { renderMarkup } from "@/lib/testing/markup";
import { PieceFilesList } from "./PieceFilesList";

// Deleting and replacing import server actions, which reach the database.
vi.mock("@/app/actions/files", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const files = [{ id: "file-1", displayName: "Sopran.pdf", size: 1024, category: null }];

function render(props: { compact?: boolean; readOnly?: boolean }): string {
  return renderMarkup(
    createElement(PieceFilesList, {
      groupSlug: "koren",
      files,
      onAggregateError: () => {},
      onClearAggregateError: () => {},
      ...props,
    }),
  );
}

/** The opening tag of the File's download link, if there is one. */
function downloadLinkTag(html: string): string | undefined {
  return html.match(new RegExp(`<a[^>]*href="${fileDownloadHref("koren", "file-1")}"[^>]*>`))?.[0];
}

// iOS Safari blocks a new tab opened after an await on the tap, so a File
// opens through a plain link to its download route, never through script.
describe.each([
  ["the full list", { compact: false }],
  ["a compact list", { compact: true }],
  ["a read-only compact list", { compact: true, readOnly: true }],
])("a File in %s", (_name, props) => {
  it("opens through a plain link in a new tab", () => {
    const tag = downloadLinkTag(render(props));

    expect(tag).toBeDefined();
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener noreferrer"');
  });
});

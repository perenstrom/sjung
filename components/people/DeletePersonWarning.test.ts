import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { Dialog } from "@/components/ui/dialog";
import { renderMarkup, textOf } from "@/lib/testing/markup";
import { DeletePersonWarning } from "./DeletePersonWarning";

function render(pieces: { pieceId: string; name: string }[]): string {
  return textOf(
    renderMarkup(
      createElement(Dialog, { open: true }, createElement(DeletePersonWarning, { personName: "Hugo Alfvén", pieces }))
    )
  );
}

describe("DeletePersonWarning", () => {
  it("is a plain confirmation when the Person has no Credits", () => {
    expect(render([])).toBe("Hugo Alfvén tas bort permanent. Detta går inte att ångra.");
  });

  it("says their Credits go too and names each Piece they are credited on", () => {
    expect(
      render([
        { pieceId: "ave", name: "Ave Maria" },
        { pieceId: "kyrie", name: "Kyrie" },
      ])
    ).toBe(
      "Hugo Alfvén tas bort permanent, och tas då också bort som upphovsperson på de här styckena:" +
        "Ave MariaKyrieDetta går inte att ångra."
    );
  });
});

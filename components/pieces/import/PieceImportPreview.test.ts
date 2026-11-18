import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { buildImportPlan, NO_IMPORT_CHOICES, type ImportPreview } from "@/lib/pieces/import";
import { renderMarkup, textOf } from "@/lib/testing/markup";
import { PieceImportPreview } from "./PieceImportPreview";

describe("PieceImportPreview", () => {
  const plan = buildImportPlan(
    [
      "Titel\tKompositör\tÅr",
      "Kyrie\tHugo Alfvén; Ny Person\t1791",
      "\tOkänd\t",
      "Gloria\t\t",
      "kyrie\t\t",
    ].join("\n"),
    { people: [{ id: "hugo", name: "Hugo Alfvén" }], creditRoles: ["Kompositör"], pieceTitles: ["Gloria"] },
    NO_IMPORT_CHOICES
  ) as ImportPreview;
  const text = textOf(
    renderMarkup(createElement(PieceImportPreview, { preview: plan, onColumnChange: () => {}, onDuplicateChange: () => {} }))
  );

  it("shows each row in pasted order with its People, its status or why it is skipped", () => {
    expect(text).toContain(
      "2KyrieHugo AlfvénNy Person1791Läggs till" +
        "3 Okänd Hoppas över: Titel saknas" +
        "4GloriaTiteln finns redanLägg till ändå" +
        "5kyrieDubblett av tidigare radLägg till ändå"
    );
  });

  it("says per column whether it is a Credit role the Group uses or is ignored", () => {
    expect(text).toContain("KompositörRollIgnoreraBefintlig roll: KompositörÅrRollIgnoreraStatus");
  });
});

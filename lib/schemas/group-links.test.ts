import { describe, expect, it } from "vitest";

import { formData } from "@/__tests__/support/form-data";
import {
  GROUP_LINK_LABEL_MAX_LENGTH,
  GROUP_LINK_URL_MAX_LENGTH,
  parseGroupLinkFromFormData,
  parseGroupLinkIdFromFormData,
} from "@/lib/schemas/group-links";

const VALID = { label: "Kalender", url: "https://example.se" };

describe("parseGroupLinkFromFormData", () => {
  it.each([
    [
      { label: "  Facebook-gruppen  ", url: "  https://www.facebook.com/groups/kor  " },
      "Facebook-gruppen",
      "https://www.facebook.com/groups/kor",
    ],
    [{ label: "Kalender", url: "http://example.se/kalender" }, "Kalender", "http://example.se/kalender"],
    [{ label: "Hemsida", url: "www.example.se" }, "Hemsida", "https://www.example.se"],
    [{ label: "Lokal", url: "localhost:3000/karta" }, "Lokal", "https://localhost:3000/karta"],
  ])("reads %j", (fields, label, url) => {
    expect(parseGroupLinkFromFormData(formData(fields))).toEqual({ label, url });
  });

  it("accepts a label and an address at their limits", () => {
    const label = "a".repeat(GROUP_LINK_LABEL_MAX_LENGTH);
    const url = `https://example.se/${"a".repeat(GROUP_LINK_URL_MAX_LENGTH - "https://example.se/".length)}`;

    expect(parseGroupLinkFromFormData(formData({ label, url }))).toEqual({ label, url });
  });

  it.each([
    [{ url: VALID.url }, "Namn krävs"],
    [{ ...VALID, label: "   " }, "Namn krävs"],
    [{ ...VALID, label: "a".repeat(GROUP_LINK_LABEL_MAX_LENGTH + 1) }, "Namnet får vara högst 100 tecken"],
    [{ label: VALID.label }, "Adress krävs"],
    [{ ...VALID, url: "  " }, "Adress krävs"],
    [{ ...VALID, url: "ftp://example.se" }, "Adressen måste börja med http eller https"],
    [{ ...VALID, url: "javascript:alert(1)" }, "Adressen måste börja med http eller https"],
    [{ ...VALID, url: "inte en adress" }, "Ogiltig adress"],
    [
      { ...VALID, url: `https://example.se/${"a".repeat(GROUP_LINK_URL_MAX_LENGTH)}` },
      "Adressen får vara högst 2 000 tecken",
    ],
  ])("refuses %j with %s", (fields, message) => {
    expect(() => parseGroupLinkFromFormData(formData(fields))).toThrow(message);
  });
});

describe("parseGroupLinkIdFromFormData", () => {
  it("reads the trimmed id, and refuses a blank one", () => {
    expect(parseGroupLinkIdFromFormData(formData({ linkId: "  abc  " }))).toBe("abc");
    expect(() => parseGroupLinkIdFromFormData(formData({ linkId: " " }))).toThrow("Länk saknas");
  });
});

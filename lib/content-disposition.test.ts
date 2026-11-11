import { describe, expect, it } from "vitest";

import { attachmentDisposition } from "@/lib/content-disposition";

describe("attachmentDisposition", () => {
  it("keeps a plain ASCII name as it is", () => {
    expect(attachmentDisposition("score.pdf")).toBe(
      `attachment; filename="score.pdf"; filename*=UTF-8''score.pdf`
    );
  });

  it("handles a name with quotes and å/ä/ö", () => {
    expect(attachmentDisposition(`Så "ända" vår.pdf`)).toBe(
      `attachment; filename="Sa _anda_ var.pdf"; filename*=UTF-8''S%C3%A5%20%22%C3%A4nda%22%20v%C3%A5r.pdf`
    );
  });

  it("percent-encodes the characters RFC 5987 doesn't allow bare", () => {
    expect(attachmentDisposition("a'b(c)*;\\.pdf")).toBe(
      `attachment; filename="a'b(c)*;_.pdf"; filename*=UTF-8''a%27b%28c%29%2A%3B%5C.pdf`
    );
  });
});

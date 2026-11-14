import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

import TenantGroupPage from "./page";

describe("a Group's own address", () => {
  it("sends the User to the Group's Repertoarer page", async () => {
    await expect(TenantGroupPage({ params: Promise.resolve({ groupSlug: "kor" }) })).rejects.toThrow(
      "redirect:/app/kor/setlists"
    );
  });
});

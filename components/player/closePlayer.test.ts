import { describe, expect, it, vi } from "vitest";

import { closePlayer, noteOpenedFromList } from "./closePlayer";

function fakeRouter() {
  return { back: vi.fn(), replace: vi.fn() };
}

describe("closePlayer", () => {
  it("goes back to the list the player was opened from, so back from there doesn't reopen it", () => {
    const router = fakeRouter();
    noteOpenedFromList();

    closePlayer(router, "/app/koren/pieces/p-1");

    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("goes to the Piece when the player was opened some other way, such as a reload or a shared link", () => {
    const router = fakeRouter();
    noteOpenedFromList();
    closePlayer(fakeRouter(), "/app/koren/pieces/p-1");

    closePlayer(router, "/app/koren/pieces/p-1");

    expect(router.replace).toHaveBeenCalledWith("/app/koren/pieces/p-1");
    expect(router.back).not.toHaveBeenCalled();
  });
});

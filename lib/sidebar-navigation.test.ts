import { describe, expect, it, vi } from "vitest";
import { closeMobileSidebar, switchGroup } from "./sidebar-navigation";

describe("closeMobileSidebar", () => {
  it("closes the sheet on mobile", () => {
    const setOpenMobile = vi.fn();

    closeMobileSidebar({ isMobile: true, setOpenMobile });

    expect(setOpenMobile).toHaveBeenCalledWith(false);
  });

  it("leaves the desktop sidebar alone", () => {
    const setOpenMobile = vi.fn();

    closeMobileSidebar({ isMobile: false, setOpenMobile });

    expect(setOpenMobile).not.toHaveBeenCalled();
  });
});

describe("switchGroup", () => {
  it("activates the group, navigates to it and reports the switch", async () => {
    const calls: string[] = [];

    const error = await switchGroup("korus", {
      setActiveGroup: async (slug) => {
        calls.push(`activate ${slug}`);
      },
      navigate: (href) => calls.push(`navigate ${href}`),
      onSwitched: () => calls.push("switched"),
    });

    expect(error).toBeNull();
    expect(calls).toEqual(["activate korus", "navigate /app/korus", "switched"]);
  });

  it("returns the error and neither navigates nor reports a switch when activation fails", async () => {
    const navigate = vi.fn();
    const onSwitched = vi.fn();

    const error = await switchGroup("korus", {
      setActiveGroup: async () => {
        throw new Error("Du är inte medlem i gruppen");
      },
      navigate,
      onSwitched,
    });

    expect(error).toBe("Du är inte medlem i gruppen");
    expect(navigate).not.toHaveBeenCalled();
    expect(onSwitched).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the thrown value has none", async () => {
    const error = await switchGroup("korus", {
      setActiveGroup: async () => {
        throw "nope";
      },
      navigate: () => {},
      onSwitched: () => {},
    });

    expect(error).toBe("Kunde inte byta grupp");
  });
});

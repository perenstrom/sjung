import { describe, expect, it, vi } from "vitest";
import { closeMobileSidebar, groupNavItems, switchGroup } from "./sidebar-navigation";

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

describe("groupNavItems", () => {
  it("lists Repertoarer first, then Noter, Personer and Medlemmar", () => {
    expect(groupNavItems({ groupSlug: "kor", canManageMembers: true })).toEqual([
      { key: "setLists", label: "Repertoarer", href: "/app/kor/setlists" },
      { key: "pieces", label: "Noter", href: "/app/kor/pieces" },
      { key: "people", label: "Personer", href: "/app/kor/people" },
      { key: "members", label: "Medlemmar", href: "/app/kor/members" },
    ]);
  });

  it("leaves out Medlemmar for those who can't manage members", () => {
    expect(
      groupNavItems({ groupSlug: "kor", canManageMembers: false }).map((item) => item.label)
    ).toEqual(["Repertoarer", "Noter", "Personer"]);
  });

  it("disables the items when there is no active group", () => {
    expect(groupNavItems({ groupSlug: null, canManageMembers: false })).toEqual([
      { key: "setLists", label: "Repertoarer", href: null },
      { key: "pieces", label: "Noter", href: null },
      { key: "people", label: "Personer", href: null },
    ]);
  });
});

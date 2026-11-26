import { describe, expect, it } from "vitest";
import { closeMobileSidebar, groupNavItems, isAtOrUnder, switchGroup } from "./sidebar-navigation";

// The injected callbacks are the outcome: they stand in for the sidebar sheet's
// state and the router, so each test records the calls they receive.

describe("closeMobileSidebar", () => {
  it.each([
    ["closes the sheet on mobile", true, [false]],
    ["leaves the desktop sidebar alone", false, []],
  ])("%s", (_, isMobile, expected) => {
    const opened: boolean[] = [];

    closeMobileSidebar({ isMobile, setOpenMobile: (open) => opened.push(open) });

    expect(opened).toEqual(expected);
  });
});

/** Switches to `korus` with `setActiveGroup`, recording each step taken after it resolves. */
async function switchToKorus(setActiveGroup: (slug: string) => Promise<void>) {
  const calls: string[] = [];
  const error = await switchGroup("korus", {
    setActiveGroup: async (slug) => {
      await setActiveGroup(slug);
      calls.push(`activate ${slug}`);
    },
    navigate: (href) => calls.push(`navigate ${href}`),
    onSwitched: () => calls.push("switched"),
  });
  return { error, calls };
}

describe("switchGroup", () => {
  it("activates the group, navigates to it and reports the switch", async () => {
    expect(await switchToKorus(async () => {})).toEqual({
      error: null,
      calls: ["activate korus", "navigate /app/korus", "switched"],
    });
  });

  it.each<[string, unknown, string]>([
    ["the thrown message", new Error("Du är inte medlem i gruppen"), "Du är inte medlem i gruppen"],
    ["a generic message when the thrown value has none", "nope", "Kunde inte byta grupp"],
  ])("returns %s and does nothing else when activation fails", async (_, thrown, message) => {
    expect(
      await switchToKorus(async () => {
        throw thrown;
      }),
    ).toEqual({ error: message, calls: [] });
  });
});

describe("groupNavItems", () => {
  it("lists Hem first, then Repertoarer, Alla noter, Upphovspersoner and Medlemmar", () => {
    expect(groupNavItems({ groupSlug: "kor", canViewMembers: true })).toEqual([
      { key: "home", label: "Hem", href: "/app/kor" },
      { key: "setLists", label: "Repertoarer", href: "/app/kor/setlists" },
      { key: "pieces", label: "Alla noter", href: "/app/kor/pieces" },
      { key: "people", label: "Upphovspersoner", href: "/app/kor/people" },
      { key: "members", label: "Medlemmar", href: "/app/kor/members" },
    ]);
  });

  it("leaves out Medlemmar for those who can't open the members page", () => {
    expect(groupNavItems({ groupSlug: "kor", canViewMembers: false }).map((item) => item.label)).toEqual([
      "Hem",
      "Repertoarer",
      "Alla noter",
      "Upphovspersoner",
    ]);
  });

  it("disables the items when there is no active group", () => {
    expect(groupNavItems({ groupSlug: null, canViewMembers: false })).toEqual([
      { key: "home", label: "Hem", href: null },
      { key: "setLists", label: "Repertoarer", href: null },
      { key: "pieces", label: "Alla noter", href: null },
      { key: "people", label: "Upphovspersoner", href: null },
    ]);
  });
});

describe("isAtOrUnder", () => {
  it.each([
    ["/app/news", true],
    ["/app/news/abc", true],
    ["/app/newsletter", false],
    ["/app", false],
  ])("%s is %s for /app/news", (pathname, expected) => {
    expect(isAtOrUnder(pathname, "/app/news")).toBe(expected);
  });
});

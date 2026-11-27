import { describe, expect, it } from "vitest";

import { groupLinkHost, sortGroupLinks } from "@/lib/groups/group-links";

describe("sortGroupLinks", () => {
  it("orders by label in Swedish order, numbers by value, then same labels by address", () => {
    const links = [
      { label: "Övrigt", url: "https://a.se" },
      { label: "Kalender", url: "https://b.se" },
      { label: "Ärenden", url: "https://c.se" },
      { label: "Stämma 10", url: "https://d.se" },
      { label: "kalender", url: "https://a.se" },
      { label: "Stämma 2", url: "https://e.se" },
      { label: "Zon", url: "https://f.se" },
    ];

    expect(sortGroupLinks(links).map(({ label, url }) => `${label} ${url}`)).toEqual([
      "kalender https://a.se",
      "Kalender https://b.se",
      "Stämma 2 https://e.se",
      "Stämma 10 https://d.se",
      "Zon https://f.se",
      "Ärenden https://c.se",
      "Övrigt https://a.se",
    ]);
  });
});

describe("groupLinkHost", () => {
  it.each([
    ["https://www.facebook.com/groups/kor", "facebook.com"],
    ["http://calendar.google.com/calendar?cid=1", "calendar.google.com"],
    ["https://localhost:3000/karta", "localhost:3000"],
  ])("shows %s as %s", (url, host) => {
    expect(groupLinkHost(url)).toBe(host);
  });
});

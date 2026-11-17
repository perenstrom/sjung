import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { renderMarkup, textOf } from "@/lib/testing/markup";
import PrivacyPolicyPage from "./page";

describe("the Privacy policy page", () => {
  const text = textOf(renderMarkup(createElement(PrivacyPolicyPage)));

  it.each([
    ["its title", "Integritetspolicy"],
    ["when it last changed", "Senast uppdaterad"],
    ["the controller", "Per Enström"],
    ["the contact address", "integritet@sjung.app"],
    ["the server and database host", "Hetzner"],
    ["where Files are stored", "Cloudflare"],
    ["the email provider", "Resend"],
    ["the Data Privacy Framework", "Data Privacy Framework"],
    ["how to delete one's account", "Ta bort konto"],
    ["the supervisory authority", "Integritetsskyddsmyndigheten (IMY)"],
  ])("states %s", (_what, expected) => {
    expect(text).toContain(expected);
  });
});

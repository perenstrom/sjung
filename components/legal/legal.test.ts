import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { hasLink, renderMarkup, textOf } from "@/lib/testing/markup";
import { FileRightsReminder } from "./FileRightsReminder";
import { PublicFooter } from "./PublicFooter";
import { SignupTermsNotice } from "./SignupTermsNotice";

describe("PublicFooter", () => {
  const html = renderMarkup(createElement(PublicFooter));

  it("links the Privacy policy and the Terms of use", () => {
    expect(hasLink(html, "/privacy", "Integritetspolicy")).toBe(true);
    expect(hasLink(html, "/terms", "Användarvillkor")).toBe(true);
  });
});

describe("SignupTermsNotice", () => {
  const html = renderMarkup(createElement(SignupTermsNotice));

  it("tells the visitor that creating an account accepts the Terms of use, with links to both pages", () => {
    expect(textOf(html)).toBe(
      "Genom att skapa ett konto godkänner du användarvillkoren. Läs om hur vi hanterar personuppgifter i vår integritetspolicy.",
    );
    expect(hasLink(html, "/terms", "användarvillkoren")).toBe(true);
    expect(hasLink(html, "/privacy", "integritetspolicy")).toBe(true);
  });
});

describe("FileRightsReminder", () => {
  const html = renderMarkup(createElement(FileRightsReminder));

  it("reminds the User to upload only Files they may store, linking the Terms of use", () => {
    expect(textOf(html)).toBe("Ladda bara upp filer du har rätt att lagra digitalt. Läs användarvillkoren.");
    expect(hasLink(html, "/terms", "användarvillkoren")).toBe(true);
  });
});

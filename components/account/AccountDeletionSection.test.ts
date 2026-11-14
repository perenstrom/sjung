import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AccountDeletionSection } from "./AccountDeletionSection";
import type { CreatorGroups } from "@/lib/account/account-deletion";

// The form posts to a server action, which reaches the database.
vi.mock("@/app/actions/account", () => ({ deleteOwnAccount: vi.fn() }));

function render(plan: CreatorGroups): string {
  return renderToStaticMarkup(createElement(AccountDeletionSection, plan));
}

function textOf(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

/** The opening tag of the element carrying `marker`, e.g. `type="submit"`. */
function tagWith(html: string, marker: string): string {
  const tag = html.match(new RegExp(`<[^>]*${marker}[^>]*>`))?.[0];
  if (!tag) {
    throw new Error(`No element with ${marker} in:\n${html}`);
  }
  return tag;
}

/** The attribute, not the `disabled:` style variants in class names. */
const DISABLED = ' disabled=""';

const solo = { id: "g1", name: "Bara jag", slug: "bara-jag" };
const shared = { id: "g2", name: "Kören", slug: "koren" };

describe("AccountDeletionSection", () => {
  it("is headed Ta bort konto and says content in other Groups stays without an author", () => {
    const text = textOf(render({ soloGroups: [], sharedGroups: [] }));

    expect(text).toContain("Ta bort konto");
    expect(text).toContain("ligger kvar i grupperna, men visas inte längre som ditt");
  });

  it("asks for the password and lets the User delete when nothing blocks it", () => {
    const html = render({ soloGroups: [], sharedGroups: [] });

    expect(tagWith(html, 'name="password"')).not.toContain(DISABLED);
    expect(tagWith(html, 'type="submit"')).not.toContain(DISABLED);
  });

  it("lists the Groups that are deleted along with the account", () => {
    const text = textOf(render({ soloGroups: [solo], sharedGroups: [] }));

    expect(text).toContain("tas bort tillsammans med kontot");
    expect(text).toContain("Bara jag");
  });

  describe("while the User is Creator of a Group with other Members", () => {
    const html = render({ soloGroups: [solo], sharedGroups: [shared] });

    it("lists those Groups, each linking to where it can be deleted", () => {
      expect(textOf(html)).toContain("Kören");
      expect(html).toContain('href="/app/me/groups"');
    });

    it("says Creator can't be handed over yet", () => {
      expect(textOf(html)).toContain("går inte att lämna över");
    });

    it("disables the delete button", () => {
      expect(tagWith(html, 'type="submit"')).toContain(DISABLED);
    });
  });
});

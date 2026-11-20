import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { INVITATION_PATH } from "@/lib/invitations/routes";
import { metadata as authMetadata } from "@/app/auth/layout";
import { metadata as invitationMetadata } from "@/app/invitation/layout";

describe("robots.txt", () => {
  const rules = [robots().rules].flat();
  const disallowed = rules.flatMap((rule) => [rule.disallow ?? []].flat());

  it("keeps crawlers out of the signed-in area and the API", () => {
    expect(disallowed).toEqual(expect.arrayContaining(["/app", "/api"]));
  });

  // A crawler that may not fetch a page never sees its noindex, and a
  // disallowed URL can still be listed from outside links.
  it.each(["/auth", INVITATION_PATH])("lets crawlers fetch %s so they see its noindex", (path) => {
    expect(disallowed.some((prefix) => path.startsWith(prefix))).toBe(false);
  });
});

describe("noindex on pages whose URL can carry a Token", () => {
  it.each([
    ["/auth", authMetadata],
    [INVITATION_PATH, invitationMetadata],
  ])("marks every page under %s noindex", (_segment, metadata) => {
    expect(metadata.robots).toEqual({ index: false });
  });
});

import { describe, expect, it } from "vitest";
import { mergeRefs } from "./merge-refs";

describe("mergeRefs", () => {
  it("sets an object ref", () => {
    const ref: { current: string | null } = { current: null };
    mergeRefs(ref)("node");
    expect(ref.current).toBe("node");
  });

  it("calls a callback ref", () => {
    const seen: (string | null)[] = [];
    mergeRefs<string>((node) => {
      seen.push(node);
    })("node");
    expect(seen).toEqual(["node"]);
  });

  it("hands the same node to every ref and skips missing ones", () => {
    const first: { current: string | null } = { current: null };
    const seen: (string | null)[] = [];
    mergeRefs<string>(first, undefined, null, (node) => {
      seen.push(node);
    })("node");
    expect(first.current).toBe("node");
    expect(seen).toEqual(["node"]);
  });

  it("clears object refs when React detaches with null", () => {
    const ref: { current: string | null } = { current: "node" };
    mergeRefs(ref)(null);
    expect(ref.current).toBeNull();
  });
});

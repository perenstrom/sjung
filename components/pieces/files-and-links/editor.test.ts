import { describe, expect, it } from "vitest";

import { type EditorTarget, isBlocked, nextEditor } from "./editor";

const addFile: EditorTarget = { kind: "addFile" };
const addLink: EditorTarget = { kind: "addLink" };
const renameFile1: EditorTarget = { kind: "renameFile", id: "file-1" };
const replaceFile1: EditorTarget = { kind: "replaceFile", id: "file-1" };
const renameFile2: EditorTarget = { kind: "renameFile", id: "file-2" };
const editLink1: EditorTarget = { kind: "editLink", id: "link-1" };

describe("nextEditor", () => {
  // One editor is open per Piece, across Files and Links and across Categories.
  it.each([
    ["a File editor closes a Link editor", editLink1, renameFile1],
    ["an add editor closes a rename", renameFile1, addLink],
    ["replacing a File closes renaming it", renameFile1, replaceFile1],
    ["another File's rename closes this one's", renameFile1, renameFile2],
    ["the first editor opens", null, addFile],
  ])("opening one closes the open one: %s", (_case, open, target) => {
    expect(nextEditor(open, target, true)).toEqual(target);
  });

  it("closes the open editor when it closes", () => {
    expect(nextEditor(renameFile1, { kind: "renameFile", id: "file-1" }, false)).toBeNull();
  });

  it("leaves the open editor open when another one reports closing", () => {
    expect(nextEditor(editLink1, renameFile1, false)).toEqual(editLink1);
  });
});

describe("isBlocked", () => {
  it("blocks nothing while no editor is open", () => {
    expect(isBlocked(null, addFile)).toBe(false);
    expect(isBlocked(null)).toBe(false);
  });

  it("keeps the open editor's own control available", () => {
    expect(isBlocked(renameFile1, { kind: "renameFile", id: "file-1" })).toBe(false);
  });

  it.each([addFile, addLink, replaceFile1, renameFile2, editLink1])(
    "blocks every other editor while one is open: %o",
    (target) => {
      expect(isBlocked(renameFile1, target)).toBe(true);
    }
  );

  it("blocks removing anything while an editor is open", () => {
    expect(isBlocked(addLink)).toBe(true);
  });
});

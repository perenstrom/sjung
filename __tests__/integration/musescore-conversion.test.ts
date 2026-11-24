import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (await import("../support/after")).after,
}));

import type { File, Group, Piece } from "@/app/generated/prisma/client";
import { FileConversionState, GroupClaim } from "@/app/generated/prisma/enums";
import {
  createPieceFileReplaceUploadUrl,
  createPieceFileUploadUrl,
  deletePieceFile,
  finalizePieceFileReplace,
  finalizePieceFileUpload,
} from "@/app/actions/files";
import { resetAfterTasks, runAfterTasks, takeAfterTasks } from "../support/after";
import { testPrisma } from "../support/db";
import {
  CONVERTED_PREFIX,
  conversionArrived,
  convertedScores,
  failConversionsWith,
  holdConversions,
  makeConverterUnreachable,
} from "../support/fake-musescore-converter";
import { putStoredObject, storedBody, storedKeys } from "../support/fake-object-storage";
import { createGroup, createMember, createPiece } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

let group: Group;
let piece: Piece;

beforeEach(async () => {
  resetAfterTasks();
  group = await createGroup();
  piece = await createPiece({ groupId: group.id, createdById: group.createdById });
  actAs((await createMember(group, [GroupClaim.MANAGE_CONTENT])).id);
});

const MSCZ = { mimeType: "application/octet-stream" };

/** Signs an upload as the browser would, then puts `content` where it points, as the browser's PUT would. */
async function upload(
  sign: (declared: { fileName: string; mimeType: string; size: string }) => Promise<{ storagePath: string }>,
  fileName: string,
  content: string,
  mimeType = MSCZ.mimeType,
): Promise<string> {
  const body = new TextEncoder().encode(content);
  const { storagePath } = await sign({ fileName, mimeType, size: String(body.byteLength) });
  putStoredObject(storagePath, { size: body.byteLength, contentType: mimeType }, body);
  return storagePath;
}

/** Uploads a new File to the Piece; its conversion, if any, is scheduled but not yet run. */
async function uploadFile(fileName: string, content: string, mimeType?: string): Promise<File> {
  const storagePath = await upload(
    (declared) => createPieceFileUploadUrl(formData({ groupSlug: group.slug, pieceId: piece.id, ...declared })),
    fileName,
    content,
    mimeType,
  );
  await finalizePieceFileUpload(formData({ groupSlug: group.slug, pieceId: piece.id, fileName, storagePath }));
  return testPrisma.file.findUniqueOrThrow({ where: { storagePath } });
}

/** Replaces the File's content; its conversion, if any, is scheduled but not yet run. */
async function replaceFile(file: File, fileName: string, content: string, mimeType?: string): Promise<string> {
  const storagePath = await upload(
    (declared) => createPieceFileReplaceUploadUrl(formData({ groupSlug: group.slug, fileId: file.id, ...declared })),
    fileName,
    content,
    mimeType,
  );
  await finalizePieceFileReplace(formData({ groupSlug: group.slug, fileId: file.id, fileName, storagePath }));
  return storagePath;
}

function reload(file: File) {
  return testPrisma.file.findUniqueOrThrow({ where: { id: file.id } });
}

function text(bytes: Uint8Array | null): string | null {
  return bytes && new TextDecoder().decode(bytes);
}

/** A MuseScore File whose conversion has finished. */
async function convertedFile(content = "partitur"): Promise<File> {
  const file = await uploadFile("Partitur.mscz", content);
  await runAfterTasks();
  return reload(file);
}

describe("uploading a MuseScore File", () => {
  it("is pending until the worker has converted it, then ready with its copy stored next to it", async () => {
    const file = await uploadFile("Partitur.mscz", "partitur");

    expect(file).toMatchObject({ conversionState: FileConversionState.PENDING, convertedStoragePath: null });
    expect(convertedScores()).toEqual([]);

    await runAfterTasks();

    const converted = await reload(file);
    expect(converted.conversionState).toBe(FileConversionState.READY);
    expect(converted.convertedStoragePath?.startsWith(`groups/${group.id}/pieces/${piece.id}/`)).toBe(true);
    expect(text(storedBody(converted.convertedStoragePath!))).toBe(`${CONVERTED_PREFIX}partitur`);
    expect(storedKeys()).toEqual([file.storagePath, converted.convertedStoragePath].sort());
  });

  it.each([
    { case: "the worker can't convert the score", breakIt: () => failConversionsWith(422) },
    { case: "the worker can't be reached", breakIt: makeConverterUnreachable },
  ])("fails, keeping the File and storing no copy, when $case", async ({ breakIt }) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    breakIt();
    const file = await uploadFile("Partitur.mscz", "partitur");

    await runAfterTasks();

    expect(await reload(file)).toMatchObject({
      conversionState: FileConversionState.FAILED,
      convertedStoragePath: null,
    });
    expect(storedKeys()).toEqual([file.storagePath]);
  });

  it("converts nothing for a File the player plays as uploaded", async () => {
    const file = await uploadFile("Partitur.mxl", "partitur");

    await runAfterTasks();

    expect(await reload(file)).toMatchObject({ conversionState: null, convertedStoragePath: null });
    expect(convertedScores()).toEqual([]);
  });
});

describe("replacing a MuseScore File", () => {
  it("is pending with no copy, the old source and copy gone, until the new source is converted", async () => {
    const file = await convertedFile("gammal");

    const newPath = await replaceFile(file, "Ny.mscz", "ny");

    expect(await reload(file)).toMatchObject({
      storagePath: newPath,
      conversionState: FileConversionState.PENDING,
      convertedStoragePath: null,
    });
    expect(storedKeys()).toEqual([newPath]);

    await runAfterTasks();

    const converted = await reload(file);
    expect(converted.conversionState).toBe(FileConversionState.READY);
    expect(text(storedBody(converted.convertedStoragePath!))).toBe(`${CONVERTED_PREFIX}ny`);
    expect(storedKeys()).toEqual([newPath, converted.convertedStoragePath].sort());
  });

  it("with a File played as uploaded, removes the copy and converts nothing", async () => {
    const file = await convertedFile();

    const newPath = await replaceFile(file, "Ny.pdf", "ny", "application/pdf");
    await runAfterTasks();

    expect(await reload(file)).toMatchObject({ conversionState: null, convertedStoragePath: null });
    expect(storedKeys()).toEqual([newPath]);
    expect(convertedScores()).toHaveLength(1);
  });

  it("while its old source is being converted, drops that copy and keeps the File pending on the new source", async () => {
    const file = await uploadFile("Partitur.mscz", "gammal");
    const release = holdConversions();
    const arrived = conversionArrived();
    const convertOld = takeAfterTasks()();
    await arrived;

    const newPath = await replaceFile(file, "Ny.mscz", "ny");
    release();
    await convertOld;

    expect(await reload(file)).toMatchObject({
      storagePath: newPath,
      conversionState: FileConversionState.PENDING,
      convertedStoragePath: null,
    });
    expect(storedKeys()).toEqual([newPath]);
  });
});

describe("deleting a MuseScore File", () => {
  it("removes its copy along with its source", async () => {
    const file = await convertedFile();

    await deletePieceFile(formData({ groupSlug: group.slug, fileId: file.id }));

    expect(storedKeys()).toEqual([]);
  });
});

describe("finalizing an upload", () => {
  it("refuses to make a File of another File's converted copy", async () => {
    const file = await convertedFile();

    await expect(
      finalizePieceFileUpload(
        formData({
          groupSlug: group.slug,
          pieceId: piece.id,
          fileName: "kopia.mxl",
          storagePath: file.convertedStoragePath!,
        }),
      ),
    ).rejects.toThrow("Filen finns redan");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import type { Group, Piece } from "@/app/generated/prisma/client";
import { FileConversionState } from "@/app/generated/prisma/enums";
import { groupSetListPath } from "@/lib/groups/routes";
import { pieceHref, playerHref } from "@/lib/pieces/href";
import { getPlayerData } from "@/lib/pieces/player";
import { PLAYER_SOUNDFONT_KEY } from "@/lib/player/soundfont";
import {
  createFile,
  createGroup,
  createMember,
  createPiece,
  createSetList,
  createSetListPiece,
  createUser,
} from "../support/fixtures";
import { actAs } from "../support/session";

let group: Group;
let piece: Piece;

beforeEach(async () => {
  group = await createGroup();
  piece = await createPiece({ groupId: group.id, createdById: group.createdById, name: "Vem kan segla" });
  actAs((await createMember(group)).id);
});

function audioFile(onPiece: Piece, displayName: string, category: string | null = null) {
  return createFile(onPiece, category, { displayName, fileName: `${displayName}.mp3`, mimeType: "audio/mpeg" });
}

describe("opening the player", () => {
  it("opens a Playable File for any Member, without the right to manage content", async () => {
    const file = await audioFile(piece, "Sopran");

    const player = await getPlayerData(group.slug, piece.id, file.id);

    expect(player).toMatchObject({
      pieceName: "Vem kan segla",
      file: { id: file.id, displayName: "Sopran", format: { engine: "audio", label: "MP3" } },
    });
    expect(player?.file.src).toContain(file.storagePath);
  });

  it("opens a MIDI or notation File with the soundfont to play it with, and an audio File without", async () => {
    const midi = await createFile(piece, null, {
      displayName: "Alla stämmor",
      fileName: "alla.mid",
      mimeType: "application/octet-stream",
    });
    const score = await createFile(piece, null, {
      displayName: "Partitur",
      fileName: "partitur.mxl",
      mimeType: "application/vnd.recordare.musicxml",
    });
    const audio = await audioFile(piece, "Sopran");

    const midiPlayer = await getPlayerData(group.slug, piece.id, midi.id);
    const scorePlayer = await getPlayerData(group.slug, piece.id, score.id);
    const audioPlayer = await getPlayerData(group.slug, piece.id, audio.id);

    expect(midiPlayer?.file.format).toEqual({ engine: "midi", label: "MIDI" });
    expect(midiPlayer?.soundfontSrc).toContain(PLAYER_SOUNDFONT_KEY);
    expect(scorePlayer?.file.format).toEqual({ engine: "notation", label: "MXL" });
    expect(scorePlayer?.soundfontSrc).toContain(PLAYER_SOUNDFONT_KEY);
    expect(audioPlayer?.soundfontSrc).toBeNull();
  });

  it("plays a converted MuseScore File from its copy, as a score", async () => {
    const score = await createFile(piece, null, {
      displayName: "Partitur",
      fileName: "partitur.mscz",
      mimeType: "application/octet-stream",
      conversionState: FileConversionState.READY,
    });

    const player = await getPlayerData(group.slug, piece.id, score.id);

    expect(player?.file.format).toEqual({ engine: "notation", label: "MuseScore" });
    expect(player?.file.src).toContain(score.convertedStoragePath);
    expect(player?.files.map(({ id }) => id)).toEqual([score.id]);
  });

  it.each([FileConversionState.PENDING, FileConversionState.FAILED])(
    "neither opens nor offers a MuseScore File whose conversion is %s",
    async (conversionState) => {
      const score = await createFile(piece, null, {
        fileName: "partitur.mscz",
        mimeType: "application/octet-stream",
        conversionState,
      });
      const sopran = await audioFile(piece, "Sopran");

      expect(await getPlayerData(group.slug, piece.id, score.id)).toBeNull();
      expect((await getPlayerData(group.slug, piece.id, sopran.id))?.files.map(({ id }) => id)).toEqual([sopran.id]);
    },
  );

  it("offers the Piece's other Playable Files in the order the Piece lists them, and no other Files", async () => {
    const sopran = await audioFile(piece, "Sopran", "Övningsfiler");
    const alt = await audioFile(piece, "Alt", "Övningsfiler");
    const inspelning = await audioFile(piece, "Konsert", "Inspelningar");
    const utan = await audioFile(piece, "Bas");
    await createFile(piece, "Noter", { displayName: "Noter", fileName: "noter.pdf" });
    await audioFile(await createPiece({ groupId: group.id, createdById: group.createdById }), "Tenor");

    const player = await getPlayerData(group.slug, piece.id, sopran.id);

    expect(player?.files.map(({ id }) => id)).toEqual([alt.id, sopran.id, inspelning.id, utan.id]);
    expect(player?.files[0]).toMatchObject({ displayName: "Alt", formatLabel: "MP3" });
  });

  it("closes to the Piece and switches File on the Piece", async () => {
    const sopran = await audioFile(piece, "Sopran");

    const player = await getPlayerData(group.slug, piece.id, sopran.id);

    expect(player?.closeHref).toBe(pieceHref(group.slug, piece.id));
    expect(player?.files[0].href).toBe(playerHref(group.slug, piece.id, sopran.id));
  });

  it("opened from a Set list piece, closes to its Set list and switches File on that Set list piece", async () => {
    const sopran = await audioFile(piece, "Sopran");
    const setList = await createSetList(group);
    const setListPiece = await createSetListPiece(setList, piece);

    const player = await getPlayerData(group.slug, piece.id, sopran.id, { fromSetListPieceId: setListPiece.id });

    expect(player?.closeHref).toBe(groupSetListPath(group.slug, setList.id));
    expect(player?.files[0].href).toBe(
      playerHref(group.slug, piece.id, sopran.id, { fromSetListPieceId: setListPiece.id }),
    );
  });

  it.each([
    {
      case: "someone outside the Group",
      open: async () => {
        const file = await audioFile(piece, "Sopran");
        actAs((await createUser()).id);
        return getPlayerData(group.slug, piece.id, file.id);
      },
    },
    {
      case: "a File that is not playable",
      open: async () => getPlayerData(group.slug, piece.id, (await createFile(piece)).id),
    },
    {
      case: "a File on another Piece",
      open: async () => {
        const other = await createPiece({ groupId: group.id, createdById: group.createdById });
        return getPlayerData(group.slug, piece.id, (await audioFile(other, "Sopran")).id);
      },
    },
    {
      case: "another Group's Piece and File",
      open: async () => {
        const otherGroup = await createGroup();
        const other = await createPiece({ groupId: otherGroup.id, createdById: otherGroup.createdById });
        return getPlayerData(group.slug, other.id, (await audioFile(other, "Sopran")).id);
      },
    },
    {
      case: "a Set list piece of another Piece",
      open: async () => {
        const other = await createPiece({ groupId: group.id, createdById: group.createdById });
        const setListPiece = await createSetListPiece(await createSetList(group), other);
        const file = await audioFile(piece, "Sopran");
        return getPlayerData(group.slug, piece.id, file.id, { fromSetListPieceId: setListPiece.id });
      },
    },
    {
      case: "a Set list piece in another Group",
      open: async () => {
        const otherGroup = await createGroup();
        const setListPiece = await createSetListPiece(await createSetList(otherGroup), piece);
        const file = await audioFile(piece, "Sopran");
        return getPlayerData(group.slug, piece.id, file.id, { fromSetListPieceId: setListPiece.id });
      },
    },
  ])("finds nothing for $case", async ({ open }) => {
    expect(await open()).toBeNull();
  });
});

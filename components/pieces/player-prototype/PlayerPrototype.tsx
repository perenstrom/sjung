"use client";

// PROTOTYPE (PER-458): three player variants on one route, switched with
// `?variant=A|B|C`; `?file=` picks which stub Playable File is open.

import { useSearchParams } from "next/navigation";

import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";

import { findFixture, type PlayableFixture } from "./fixtures";
import { usePlayerState } from "./usePlayerState";
import { VARIANTS } from "./variants";

export function PlayerPrototype({
  groupSlug,
  pieceId,
  pieceName,
  setList,
}: {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  setList?: { id: string; name: string };
}) {
  const params = useSearchParams();
  const variantKey = params.get("variant") ?? "A";
  const fixture = findFixture(params.get("file") ?? undefined);

  const pieceHref = `/app/${groupSlug}/pieces/${pieceId}`;
  const backHref = setList ? `/app/${groupSlug}/setlists/${setList.id}` : pieceHref;
  const hrefFor = (file: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("file", file);
    return `${pieceHref}/prototype-player?${next}`;
  };

  return (
    <>
      <Player
        key={`${variantKey}:${fixture.key}`}
        variantKey={variantKey}
        fixture={fixture}
        ctx={{ pieceName, backHref, hrefFor, setListName: setList?.name }}
      />
      <div className="fixed inset-x-0 top-0 z-50 flex h-9 items-center gap-2 bg-amber-300 px-2 text-[10px] leading-tight text-black">
        <PrototypeSwitcher variants={VARIANTS} current={variantKey} inline />
        <details className="min-w-0 flex-1">
          <summary className="truncate">PROTOTYP · {fixture.note}</summary>
          <p className="absolute inset-x-0 top-9 bg-amber-300 p-2">{fixture.note}</p>
        </details>
      </div>
    </>
  );
}

function Player({
  variantKey,
  fixture,
  ctx,
}: {
  variantKey: string;
  fixture: PlayableFixture;
  ctx: Parameters<(typeof VARIANTS)[number]["Component"]>[0]["ctx"];
}) {
  const state = usePlayerState(fixture);
  const variant = VARIANTS.find((v) => v.key === variantKey) ?? VARIANTS[0];
  const { Component } = variant;
  return <Component ctx={ctx} state={state} />;
}

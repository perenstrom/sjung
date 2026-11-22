"use client";

// PROTOTYPE (PER-458): three player variants on one route, switched with
// `?variant=A|B|C`; `?file=` picks which stub Playable File is open.
// PER-464 adds `?variant=T`: variant A playing the real file with alphaTab.
// PER-463 adds `?variant=D|E|F`: the player on a desktop or tablet-width
// screen. Without `?variant=` the player reopens the variant last looked at,
// so a Playable File's row opens it the same way.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import type { AppBreadcrumbStaticTrail } from "@/lib/breadcrumbs";

import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";

import { AlphaTabPlayer } from "./alphatab/AlphaTabPlayer";
import { DESKTOP_VARIANTS, DesktopPlayer } from "./desktop/DesktopPlayer";
import { findFixture, type PlayableFixture } from "./fixtures";
import { usePlayerState } from "./usePlayerState";
import { VARIANTS } from "./variants";

export function PlayerPrototype({
  groupSlug,
  pieceId,
  pieceName,
  setList,
  trail,
}: {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  setList?: { id: string; name: string };
  trail: AppBreadcrumbStaticTrail;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const variantKey = params.get("variant") ?? "A";
  const explicit = params.has("variant");
  useEffect(() => {
    const KEY = "prototype-player-variant";
    try {
      if (explicit) localStorage.setItem(KEY, variantKey);
      else {
        const last = localStorage.getItem(KEY);
        if (last && last !== variantKey) {
          const next = new URLSearchParams(params.toString());
          next.set("variant", last);
          router.replace(`${pathname}?${next}`, { scroll: false });
        }
      }
    } catch {
      // Storage blocked: stay on the default.
    }
  }, [explicit, variantKey, params, router, pathname]);
  const fixture = findFixture(params.get("file") ?? undefined);

  const pieceHref = `/app/${groupSlug}/pieces/${pieceId}`;
  const backHref = setList ? `/app/${groupSlug}/setlists/${setList.id}` : pieceHref;
  const hrefFor = (file: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("file", file);
    return `${pieceHref}/prototype-player?${next}`;
  };

  const desktop = (DESKTOP_VARIANTS as readonly string[]).includes(variantKey);
  if (desktop) {
    return (
      <DesktopPlayer
        key={`${variantKey}:${fixture.key}`}
        variant={variantKey as (typeof DESKTOP_VARIANTS)[number]}
        variants={VARIANTS}
        fixture={fixture}
        ctx={{ pieceName, backHref, hrefFor, setListName: setList?.name }}
        trail={trail}
      />
    );
  }

  return (
    <>
      {variantKey === "T" ? (
        <AlphaTabPlayer
          key={fixture.key}
          fixture={fixture}
          ctx={{ pieceName, backHref, hrefFor, setListName: setList?.name }}
        />
      ) : (
        <Player
          key={`${variantKey}:${fixture.key}`}
          variantKey={variantKey}
          fixture={fixture}
          ctx={{ pieceName, backHref, hrefFor, setListName: setList?.name }}
        />
      )}
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

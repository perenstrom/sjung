"use client";

// PROTOTYPE (PER-463): the player on a desktop or tablet-width screen, three
// variants on one route, switched with `?variant=D|E|F`; `?file=` picks which
// stub Playable File is open. Without `?variant=` the player reopens the
// variant last looked at, so a Playable File's row opens it the same way.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import type { AppBreadcrumbStaticTrail } from "@/lib/breadcrumbs";

import { DESKTOP_VARIANTS, type DesktopKey, DesktopPlayer } from "./desktop/DesktopPlayer";
import { findFixture } from "./fixtures";

const KEY = "prototype-player-variant";
const isVariant = (v: string | null): v is DesktopKey => DESKTOP_VARIANTS.some((d) => d.key === v);

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
  const asked = params.get("variant");
  const variant: DesktopKey = isVariant(asked) ? asked : "D";
  const fixture = findFixture(params.get("file") ?? undefined);

  useEffect(() => {
    try {
      if (isVariant(asked)) localStorage.setItem(KEY, asked);
      else {
        const last = localStorage.getItem(KEY);
        if (isVariant(last) && last !== variant) {
          const next = new URLSearchParams(params.toString());
          next.set("variant", last);
          router.replace(`${pathname}?${next}`, { scroll: false });
        }
      }
    } catch {
      // Storage blocked: stay on the default.
    }
  }, [asked, variant, params, router, pathname]);

  const pieceHref = `/app/${groupSlug}/pieces/${pieceId}`;
  const backHref = setList ? `/app/${groupSlug}/setlists/${setList.id}` : pieceHref;
  const hrefFor = (file: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("file", file);
    return `${pieceHref}/prototype-player?${next}`;
  };

  return (
    <DesktopPlayer
      key={`${variant}:${fixture.key}`}
      variant={variant}
      fixture={fixture}
      ctx={{ pieceName, backHref, hrefFor, setListName: setList?.name }}
      trail={trail}
    />
  );
}

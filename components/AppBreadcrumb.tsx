"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getPieceTitleForBreadcrumb } from "@/app/actions/pieces";
import { getSetListTitleForBreadcrumb } from "@/app/actions/setlists";

type GroupOption = {
  id: string;
  name: string;
  slug: string;
};

type AppBreadcrumbProps = {
  groups: GroupOption[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PIECE_TITLE_FALLBACK = "Notstycke";
const SET_LIST_TITLE_FALLBACK = "Repertoar";

type BreadcrumbAncestor = { label: string; href: string };

type BreadcrumbTail =
  | { kind: "static"; label: string }
  | { kind: "piece"; groupSlug: string; pieceId: string }
  | { kind: "setlist"; groupSlug: string; setListId: string };

type BreadcrumbTrail =
  | { visibility: "hidden" }
  | {
      visibility: "visible";
      ancestors: BreadcrumbAncestor[];
      tail: BreadcrumbTail;
    };

function groupDisplayName(groups: GroupOption[], slug: string): string {
  return groups.find((g) => g.slug === slug)?.name ?? slug;
}

function trailForPathname(pathname: string, groups: GroupOption[]): BreadcrumbTrail {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "app") {
    return { visibility: "hidden" };
  }
  if (parts.length === 1) {
    return { visibility: "hidden" };
  }
  if (parts[1] === "me") {
    if (parts.length === 2) {
      return { visibility: "hidden" };
    }
    if (parts[2] === "groups") {
      return {
        visibility: "visible",
        ancestors: [],
        tail: { kind: "static", label: "Grupphantering" },
      };
    }
    return { visibility: "hidden" };
  }

  const groupSlug = parts[1];
  const rest = parts.slice(2);
  const base = `/app/${groupSlug}`;
  const nameFor = () => groupDisplayName(groups, groupSlug);

  if (rest.length === 0) {
    return {
      visibility: "visible",
      ancestors: [{ label: nameFor(), href: base }],
      tail: { kind: "static", label: "Noter" },
    };
  }

  if (rest[0] === "people" && rest.length === 1) {
    return {
      visibility: "visible",
      ancestors: [{ label: nameFor(), href: base }],
      tail: { kind: "static", label: "Personer" },
    };
  }

  if (rest[0] === "members" && rest.length === 1) {
    return {
      visibility: "visible",
      ancestors: [{ label: nameFor(), href: base }],
      tail: { kind: "static", label: "Medlemmar" },
    };
  }

  if (rest[0] === "setlists" && rest.length === 1) {
    return {
      visibility: "visible",
      ancestors: [{ label: nameFor(), href: base }],
      tail: { kind: "static", label: "Repertoarer" },
    };
  }

  if (rest[0] === "setlists" && rest.length === 2) {
    const setListId = rest[1];
    return {
      visibility: "visible",
      ancestors: [
        { label: nameFor(), href: base },
        { label: "Repertoarer", href: `${base}/setlists` },
      ],
      tail: UUID_RE.test(setListId)
        ? { kind: "setlist", groupSlug, setListId }
        : { kind: "static", label: SET_LIST_TITLE_FALLBACK },
    };
  }

  if (rest[0] === "pieces" && rest.length === 2) {
    const pieceId = rest[1];
    return {
      visibility: "visible",
      ancestors: [
        { label: nameFor(), href: base },
        { label: "Noter", href: base },
      ],
      tail: UUID_RE.test(pieceId)
        ? { kind: "piece", groupSlug, pieceId }
        : { kind: "static", label: PIECE_TITLE_FALLBACK },
    };
  }

  return {
    visibility: "visible",
    ancestors: [{ label: nameFor(), href: base }],
    tail: { kind: "static", label: "Sida" },
  };
}

export function AppBreadcrumb({ groups }: AppBreadcrumbProps) {
  const pathname = usePathname() ?? "";
  const groupDataKey = [...groups]
    .sort((a, b) => a.slug.localeCompare(b.slug, "sv-SE"))
    .map((g) => `${g.slug}:${g.name}`)
    .join("|");
  const trail = useMemo(
    () => trailForPathname(pathname, groups),
    [pathname, groupDataKey],
  );

  const [resolvedDetailTitle, setResolvedDetailTitle] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (trail.visibility === "hidden") {
      setResolvedDetailTitle(null);
      setDetailLoading(false);
      return;
    }

    const { tail } = trail;
    if (tail.kind !== "piece" && tail.kind !== "setlist") {
      setResolvedDetailTitle(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setResolvedDetailTitle(null);

    (async () => {
      const res =
        tail.kind === "piece"
          ? await getPieceTitleForBreadcrumb(tail.groupSlug, tail.pieceId)
          : await getSetListTitleForBreadcrumb(tail.groupSlug, tail.setListId);
      if (cancelled) {
        return;
      }
      setResolvedDetailTitle(res?.title ?? null);
      setDetailLoading(false);
    })();

    return () => {
      cancelled = true;
      setDetailLoading(false);
    };
  }, [trail]);

  if (trail.visibility === "hidden") {
    return null;
  }

  const showTailSkeleton = trail.tail.kind !== "static" && detailLoading;

  return (
    <div className="min-w-0 flex-1">
      <Breadcrumb>
        <BreadcrumbList className="text-muted-foreground sm:gap-2">
          {trail.ancestors.map((crumb, index) => (
            <Fragment key={`${crumb.href}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Fragment>
          ))}
          {trail.ancestors.length > 0 ? <BreadcrumbSeparator /> : null}
          <BreadcrumbItem className="min-w-0">
            {trail.tail.kind === "static" ? (
              <BreadcrumbPage className="truncate">{trail.tail.label}</BreadcrumbPage>
            ) : showTailSkeleton ? (
              <span
                role="status"
                aria-busy="true"
                aria-label="Laddar"
                className="inline-block h-4 w-28 max-w-[min(40vw,12rem)] animate-pulse rounded-md bg-muted align-middle"
              />
            ) : (
              <BreadcrumbPage className="truncate">
                {resolvedDetailTitle ??
                  (trail.tail.kind === "piece"
                    ? PIECE_TITLE_FALLBACK
                    : SET_LIST_TITLE_FALLBACK)}
              </BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

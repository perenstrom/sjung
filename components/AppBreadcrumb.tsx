"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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

function detailFetchKeyFromTrail(trail: BreadcrumbTrail): string | null {
  if (trail.visibility !== "visible") {
    return null;
  }
  const { tail } = trail;
  if (tail.kind === "piece") {
    return `piece:${tail.groupSlug}:${tail.pieceId}`;
  }
  if (tail.kind === "setlist") {
    return `setlist:${tail.groupSlug}:${tail.setListId}`;
  }
  return null;
}

export function AppBreadcrumb({ groups }: AppBreadcrumbProps) {
  const pathname = usePathname() ?? "";
  const groupDataKey = [...groups]
    .sort((a, b) => a.slug.localeCompare(b.slug, "sv-SE"))
    .map((g) => `${g.slug}:${g.name}`)
    .join("|");
  const trail = useMemo(
    () => trailForPathname(pathname, groups),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `groupDataKey` summarizes `groups` for stable memoization
    [pathname, groupDataKey],
  );

  const fetchKey = useMemo(() => detailFetchKeyFromTrail(trail), [trail]);

  const [completedDetail, setCompletedDetail] = useState<{
    key: string;
    title: string | null;
  } | null>(null);

  const latestFetchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    latestFetchKeyRef.current = fetchKey;
    if (!fetchKey) {
      return;
    }
    const match = fetchKey.match(/^(piece|setlist):([^:]+):(.+)$/);
    if (!match) {
      return;
    }
    const [, kind, groupSlug, id] = match;
    let cancelled = false;
    const startedFor = fetchKey;

    void (async () => {
      const res =
        kind === "piece"
          ? await getPieceTitleForBreadcrumb(groupSlug, id)
          : await getSetListTitleForBreadcrumb(groupSlug, id);
      if (cancelled) {
        return;
      }
      if (latestFetchKeyRef.current !== startedFor) {
        return;
      }
      setCompletedDetail({ key: startedFor, title: res?.title ?? null });
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  if (trail.visibility === "hidden") {
    return null;
  }

  const detailLoading =
    trail.tail.kind !== "static" && fetchKey != null && completedDetail?.key !== fetchKey;
  const resolvedDetailTitle =
    fetchKey != null && completedDetail?.key === fetchKey ? completedDetail.title : null;
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

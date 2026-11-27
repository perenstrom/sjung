import { swedishNumericCollator } from "@/lib/data-table/sorting";

/** The order Home lists Group links in: by label (Swedish order, numbers by value), then by address. */
export function sortGroupLinks<T extends { label: string; url: string }>(links: readonly T[]): T[] {
  return [...links].sort(
    (a, b) => swedishNumericCollator.compare(a.label, b.label) || (a.url < b.url ? -1 : a.url > b.url ? 1 : 0),
  );
}

/** What Home shows beneath a Group link's label: the address's host, without `www.`. */
export function groupLinkHost(url: string): string {
  return new URL(url).host.replace(/^www\./, "");
}

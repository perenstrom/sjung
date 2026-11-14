import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/** Renders `element` to HTML, for tests asserting on what a view shows. */
export function renderMarkup(element: ReactElement): string {
  return renderToStaticMarkup(element);
}

/** The text a reader sees in `html`: tags dropped, apostrophes decoded and whitespace collapsed. */
export function textOf(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
}

/** Whether `html` has a link to `href` whose text is exactly `label`. */
export function hasLink(html: string, href: string, label: string): boolean {
  return new RegExp(`<a[^>]*href="${href}"[^>]*>${label}</a>`).test(html);
}

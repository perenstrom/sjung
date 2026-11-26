import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  // Links out of Sjung open in a new tab that can't reach back; links within
  // Sjung open in place.
  a: ({ href, children }) =>
    href && /^https?:\/\//i.test(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <a href={href}>{children}</a>
    ),
};

/**
 * Markdown that Members write for others to read, such as an Announcement's
 * body: GFM, with raw HTML skipped and images left out (they aren't
 * supported). Editors' previews render it the same way.
 */
export function MarkdownBody({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose max-w-none prose-neutral dark:prose-invert prose-headings:font-semibold prose-h2:text-lg prose-table:text-sm",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml disallowedElements={["img"]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

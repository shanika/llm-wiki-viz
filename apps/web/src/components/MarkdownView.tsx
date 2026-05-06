import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Link } from "react-router-dom";
import type { MarkdownDoc } from "@llm-wiki-viz/shared";

interface Props {
  doc: MarkdownDoc;
}

const WIKI_LINK_RE = /\[\[([^\]\n|]+?)(?:\|([^\]\n]+))?\]\]/g;

// Convert [[wiki-style]] links to plain markdown links the renderer understands.
// Resolved targets come from the doc's outgoing[] array — same source of truth as the API.
function preprocessWikiLinks(doc: MarkdownDoc): string {
  const byRaw = new Map<string, { target: string | null; label: string }>();
  for (const link of doc.outgoing) {
    if (link.raw.startsWith("[[")) {
      byRaw.set(link.raw, { target: link.target, label: link.label });
    }
  }
  return doc.content.replace(WIKI_LINK_RE, (match) => {
    const ref = byRaw.get(match);
    if (!ref) return match;
    if (ref.target) {
      return `[${ref.label}](kg://file/${encodeURI(ref.target)})`;
    }
    return `<span class="kg-broken">${ref.label}</span>`;
  });
}

export function MarkdownView({ doc }: Props) {
  const processed = useMemo(() => preprocessWikiLinks(doc), [doc]);

  return (
    <article className="prose-md max-w-3xl mx-auto px-8 py-8">
      <h1 className="!mt-0 !mb-6 text-4xl font-bold tracking-tight">
        {doc.title}
      </h1>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // The doc title is rendered above; drop any body h1 so it doesn't
          // appear twice (e.g. frontmatter `title: Alpha` + body `# Alpha`).
          h1: () => null,
          a: ({ href, children, ...rest }) => {
            if (href?.startsWith("kg://file/")) {
              const target = decodeURI(href.slice("kg://".length));
              return <Link to={`/${target}`}>{children}</Link>;
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" {...rest}>
                {children}
              </a>
            );
          },
          span: ({ className, children, ...rest }) => {
            if (className === "kg-broken") {
              return (
                <span
                  className="text-[var(--color-muted)] italic decoration-dotted underline"
                  title="unresolved link"
                >
                  {children}
                </span>
              );
            }
            return (
              <span className={className} {...rest}>
                {children}
              </span>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </article>
  );
}

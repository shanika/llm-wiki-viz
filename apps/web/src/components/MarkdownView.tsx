import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Link } from "react-router-dom";
import type { MarkdownDoc } from "@llm-wiki-viz/shared";
import { MermaidDiagram } from "./MermaidDiagram";

interface Props {
  doc: MarkdownDoc;
}

const WIKI_LINK_RE = /\[\[([^\]\n|]+?)(?:\|([^\]\n]+))?\]\]/g;

// Rewrite every link the API resolved (both `[[wiki]]` and `[md](path.md)`) to
// a custom `kg://file/<vault-path>` URL. The <a> override below catches that
// scheme and renders a react-router <Link> so navigation stays in-app.
function preprocessLinks(doc: MarkdownDoc): string {
  // Pass 1: wiki-style — handle resolved + broken in a single regex sweep.
  const wikiByRaw = new Map<string, { target: string | null; label: string }>();
  for (const link of doc.outgoing) {
    if (link.raw.startsWith("[[")) {
      wikiByRaw.set(link.raw, { target: link.target, label: link.label });
    }
  }
  let content = doc.content.replace(WIKI_LINK_RE, (match) => {
    const ref = wikiByRaw.get(match);
    if (!ref) return match;
    if (ref.target) {
      return `[${ref.label}](kg://file/${encodeURI(ref.target)})`;
    }
    return `<span class="kg-broken">${ref.label}</span>`;
  });

  // Pass 2: standard markdown links the API was able to resolve to a vault file.
  // String split/join gives a literal-text replaceAll without regex escaping.
  for (const link of doc.outgoing) {
    if (link.raw.startsWith("[[")) continue;
    if (!link.target) continue;
    const replacement = `[${link.label}](kg://file/${encodeURI(link.target)})`;
    content = content.split(link.raw).join(replacement);
  }

  return content;
}

export function MarkdownView({ doc }: Props) {
  const processed = useMemo(() => preprocessLinks(doc), [doc]);

  return (
    <article className="prose-md max-w-3xl mx-auto px-8 py-8">
      <h1 className="!mt-0 !mb-6 text-4xl font-bold tracking-tight">
        {doc.title}
      </h1>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        // Default urlTransform sanitizes unknown schemes — including our
        // kg:// — to "". Pass URLs through; content is local + trusted.
        urlTransform={(url) => url}
        components={{
          // The doc title is rendered above; drop any body h1 so it doesn't
          // appear twice (e.g. frontmatter `title: Alpha` + body `# Alpha`).
          h1: () => null,
          code: ({ className, children, ...rest }) => {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            if (lang === "mermaid") {
              return <MermaidDiagram code={String(children).replace(/\n$/, "")} />;
            }
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
          // Drop the surrounding <pre> for mermaid blocks so the diagram lives
          // at the article level, not inside a scrollable code-block frame.
          pre: ({ children, ...rest }) => {
            const child = Array.isArray(children) ? children[0] : children;
            if (
              child &&
              typeof child === "object" &&
              "props" in child &&
              typeof (child as { props: { className?: string } }).props
                .className === "string" &&
              /language-mermaid/.test(
                (child as { props: { className?: string } }).props.className ?? ""
              )
            ) {
              return <>{children}</>;
            }
            return <pre {...rest}>{children}</pre>;
          },
          a: ({ href, children, ...rest }) => {
            if (!href) return <a {...rest}>{children}</a>;
            // Internal vault link (resolved by preprocessLinks above).
            if (href.startsWith("kg://file/")) {
              const target = decodeURI(href.slice("kg://".length));
              return <Link to={`/${target}`}>{children}</Link>;
            }
            // Same-document anchor.
            if (href.startsWith("#")) {
              return <a href={href} {...rest}>{children}</a>;
            }
            // Anything with an explicit scheme (http, https, mailto, …) → new tab.
            if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
              return (
                <a href={href} target="_blank" rel="noreferrer" {...rest}>
                  {children}
                </a>
              );
            }
            // Schemeless relative path that the preprocessor couldn't resolve
            // (broken link, unsupported file type). Render plain — don't open
            // in a new tab.
            return <a href={href} {...rest}>{children}</a>;
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

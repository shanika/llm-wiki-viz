import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// One init per page-load: avoid re-initializing mermaid for each diagram.
let mermaidInitPromise: Promise<typeof import("mermaid").default> | null = null;
let idCounter = 0;

function getMermaid(): Promise<typeof import("mermaid").default> {
  if (mermaidInitPromise) return mermaidInitPromise;
  mermaidInitPromise = (async () => {
    const { default: mermaid } = await import("mermaid");
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "strict",
      themeVariables: {
        background: "#0a0e1a",
        primaryColor: "#0f1320",
        primaryBorderColor: "#7dd3fc",
        primaryTextColor: "#e5e9f0",
        secondaryColor: "#161c2c",
        secondaryBorderColor: "#1f2638",
        secondaryTextColor: "#e5e9f0",
        tertiaryColor: "#161c2c",
        tertiaryBorderColor: "#1f2638",
        tertiaryTextColor: "#e5e9f0",
        lineColor: "#7dd3fc",
        textColor: "#e5e9f0",
        nodeBorder: "#7dd3fc",
        clusterBkg: "#0f1320",
        clusterBorder: "#1f2638",
        labelBackground: "#0a0e1a",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "14px",
      },
    });
    return mermaid;
  })();
  return mermaidInitPromise;
}

interface Props {
  code: string;
}

export function MermaidDiagram({ code }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setSvg(null);
    (async () => {
      try {
        const mermaid = await getMermaid();
        const id = `mermaid-${++idCounter}`;
        await mermaid.parse(code);
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="mermaid-error my-4 rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-[13px] text-[var(--color-muted)]">
        <div className="font-semibold text-red-400 mb-2">Mermaid syntax error</div>
        <div className="mb-2 whitespace-pre-wrap text-[12px]">{error}</div>
        <pre className="overflow-x-auto rounded bg-[var(--color-bg)] p-2 text-[12px] text-[var(--color-fg)]">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-loading my-4 rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-6 text-center text-[13px] text-[var(--color-muted)]">
        Rendering diagram…
      </div>
    );
  }

  return (
    <>
      <div className="mermaid-frame group relative my-4 rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute top-2 right-2 z-10 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[11px] text-[var(--color-muted)] opacity-70 hover:opacity-100 hover:text-[var(--color-fg)] hover:border-[var(--color-accent)] transition"
          aria-label="Open diagram fullscreen"
          title="Open fullscreen"
        >
          ⤢ Expand
        </button>
        <div
          className="mermaid-svg flex justify-center overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {open && <MermaidFullscreen svg={svg} onClose={() => setOpen(false)} />}
    </>
  );
}

interface FullscreenProps {
  svg: string;
  onClose: () => void;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const PAN_STEP = 40;
const ZOOM_FACTOR = 1.15;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function MermaidFullscreen({ svg, onClose }: FullscreenProps) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "+":
        case "=":
          setScale((s) => clamp(s * ZOOM_FACTOR, MIN_SCALE, MAX_SCALE));
          break;
        case "-":
        case "_":
          setScale((s) => clamp(s / ZOOM_FACTOR, MIN_SCALE, MAX_SCALE));
          break;
        case "0":
          setScale(1);
          setTx(0);
          setTy(0);
          break;
        case "ArrowUp":
          setTy((y) => y + PAN_STEP);
          break;
        case "ArrowDown":
          setTy((y) => y - PAN_STEP);
          break;
        case "ArrowLeft":
          setTx((x) => x + PAN_STEP);
          break;
        case "ArrowRight":
          setTx((x) => x - PAN_STEP);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    setScale((s) => clamp(s * factor, MIN_SCALE, MAX_SCALE));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX - tx, y: e.clientY - ty };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setTx(e.clientX - dragRef.current.x);
    setTy(e.clientY - dragRef.current.y);
  };
  const onMouseUp = () => {
    dragRef.current = null;
  };

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  return createPortal(
    <div
      className="mermaid-fullscreen fixed inset-0 z-50 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* toolbar */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[13px] text-[var(--color-muted)] tracking-wide">
          Diagram
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setScale((s) => clamp(s / ZOOM_FACTOR, MIN_SCALE, MAX_SCALE))
            }
            className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-1 text-[13px] text-[var(--color-fg)] hover:border-[var(--color-accent)]"
            aria-label="Zoom out"
            title="Zoom out (−)"
          >
            −
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1 text-[12px] tabular-nums text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent)]"
            aria-label="Reset zoom"
            title="Reset (0)"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() =>
              setScale((s) => clamp(s * ZOOM_FACTOR, MIN_SCALE, MAX_SCALE))
            }
            className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-1 text-[13px] text-[var(--color-fg)] hover:border-[var(--color-accent)]"
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            +
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-1 text-[14px] text-[var(--color-fg)] hover:border-[var(--color-accent)]"
            aria-label="Close fullscreen"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>
      </div>

      {/* pan/zoom surface */}
      <div
        className="absolute inset-0 pt-14 grid place-items-center select-none"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
      >
        <div
          className="mermaid-fullscreen-svg"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragRef.current ? "none" : "transform 120ms ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>,
    document.body
  );
}

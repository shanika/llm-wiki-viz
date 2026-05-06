import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D from "react-force-graph-2d";
import type { GraphData } from "@llm-wiki-viz/shared";

interface Props {
  data: GraphData;
}

interface FGNode {
  id: string;
  label: string;
  broken?: boolean;
}

interface FGLink {
  source: string;
  target: string;
}

export function GraphView({ data }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 600 });
  const navigate = useNavigate();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graph = {
    nodes: data.nodes.map((n) => ({ id: n.id, label: n.label, broken: n.broken })),
    links: data.edges.map((e) => ({ source: e.source, target: e.target })),
  };

  return (
    <div ref={wrapRef} className="w-full h-full">
      <ForceGraph2D
        width={size.width}
        height={size.height}
        graphData={graph}
        backgroundColor="#0a0e1a"
        nodeLabel={(n) => (n as FGNode).label}
        nodeColor={(n) => ((n as FGNode).broken ? "#3f4866" : "#7dd3fc")}
        linkColor={() => "#1f2638"}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={() => "#7dd3fc"}
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as FGNode & { x?: number; y?: number };
          if (n.x == null || n.y == null) return;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "#e5e9f0";
          ctx.fillText(n.label, n.x, n.y + 6);
        }}
        onNodeClick={(node) => {
          const n = node as FGNode;
          if (!n.broken) navigate(`/file/${n.id}`);
        }}
      />
    </div>
  );
}

export type { FGLink };

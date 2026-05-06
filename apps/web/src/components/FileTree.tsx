import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { FileNode } from "@llm-wiki-viz/shared";

interface Props {
  tree: FileNode;
}

export function FileTree({ tree }: Props) {
  return (
    <ul className="text-[15px]">
      {tree.children?.map((child) => (
        <TreeNode key={child.path} node={child} depth={0} />
      ))}
    </ul>
  );
}

function TreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.startsWith("/file/")
    ? decodeURIComponent(location.pathname.slice("/file/".length))
    : "";

  const indent = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.type === "directory") {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={indent}
          className="w-full flex items-center gap-1 py-1 hover:bg-[var(--color-panel-2)] text-left text-[var(--color-muted)]"
        >
          <span className="inline-block w-3 text-xs">{open ? "▾" : "▸"}</span>
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && node.children.length > 0 && (
          <ul>
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const active = currentPath === node.path;
  return (
    <li>
      <button
        type="button"
        onClick={() => navigate(`/file/${node.path}`)}
        style={indent}
        className={
          "w-full flex items-center gap-1 py-1 hover:bg-[var(--color-panel-2)] text-left truncate " +
          (active ? "bg-[var(--color-panel-2)] text-[var(--color-accent)]" : "")
        }
      >
        <span className="inline-block w-3" />
        <span className="truncate">{node.name.replace(/\.md$/, "")}</span>
      </button>
    </li>
  );
}

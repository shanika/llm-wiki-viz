---
title: Knowledge Graph (project)
---

# Knowledge Graph

The project you're looking at right now. It renders [[index]] and the
notes in [[alpha]] and [[beta]].

## Goals

- Render markdown like Obsidian
- Track wiki-style and standard markdown links
- Surface backlinks for any open note
- Visualise the link graph

## Stack

- Express API + React UI, both TypeScript
- npm workspaces
- Tailwind v4 for styling
- `react-force-graph-2d` for the graph view

## Architecture

```mermaid
flowchart LR
  vault[("vault/")] -->|chokidar watch| api[Express API]
  api -->|"/api/tree"| ui[React UI]
  api -->|"/api/file?path"| ui
  api -->|"/api/graph"| ui
  ui --> tree[File tree]
  ui --> view[Markdown view]
  ui --> nodes[Force-directed graph]
  view -->|"wiki + md links"| view
```

## Request lifecycle

```mermaid
sequenceDiagram
  participant User
  participant UI as React UI
  participant API as Express API
  participant FS as File system

  User->>UI: click [[alpha]]
  UI->>API: GET /api/file?path=notes/alpha.md
  API->>FS: read file
  FS-->>API: contents
  API-->>UI: { content, outgoing, backlinks }
  UI-->>User: rendered page
```

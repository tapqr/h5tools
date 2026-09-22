# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

### 本仓库的偏离：上下文文档放在 `docs/contexts/<name>/`

上面那个布局假设每个上下文对应一个 `src/<context>/` 目录。本仓库是 npm workspaces，
一个上下文**横跨 `apps/api` 与 `apps/web` 两个包**（比如「天气」既有后端的 provider
归一化，也有前端那套随昼夜变色的皮肤），没有单一目录可以放它的 `CONTEXT.md`。

所以改成：

```
/
├── CONTEXT-MAP.md
├── docs/
│   ├── adr/                           ← 跨上下文的系统级决策
│   └── contexts/
│       ├── weather/
│       │   ├── CONTEXT.md
│       │   └── adr/
│       └── nav/
│           ├── CONTEXT.md
│           └── adr/
├── apps/api/
└── apps/web/
```

`CONTEXT-MAP.md` 里有一张表，把每个上下文映射到它散落在各包中的代码位置。

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_

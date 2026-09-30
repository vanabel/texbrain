# TeXbrain Future Roadmap (Draft)

> This is a long-term roadmap, not a short-term promise list.  
> Contributions are welcome in planning, implementation, and testing.

## Why this roadmap exists

TeXbrain already covers the core browser workflow (edit + compile + Git), but there is still substantial engineering work ahead to evolve it into a stronger writing tool (editor UX, compiler ecosystem, collaboration, maintainability, browser compatibility).

This document is used to:

- align future direction and reduce repeated discussion
- break work into incremental milestones for collaboration
- clarify short-/mid-term goals vs long-term exploration

## Lessons from [LatexCoder](https://github.com/EvoEvolver/LatexCoder) (2026-09)

LatexCoder is a **self-hosted** collaborative workspace (Yjs + SQLite + real Git + Tectonic/latexmk + agent file APIs). TeXbrain is **browser-only** (WASM TeX, isomorphic-git, optional WebRTC). Do **not** absorb the server stack; absorb UX/algorithm ideas that fit a static client.

| Area | TeXbrain today | LatexCoder strength | Absorb? |
| --- | --- | --- | --- |
| Hosting | Static SPA, no accounts | Node service, auth, SSH Git | No (identity conflict) |
| Compile | SwiftLaTeX (default) + BusyTeX (Xe/BibTeX), auto-routed; see [FAQ](docs/en/faq.md#two-compile-engines-swiftlatex--busytex) | Tectonic / latexmk on server | No (keep both WASM engines; optional later companion) |
| Collab | WebRTC Yjs rooms | Server Yjs + capability links + checkpoints | Partial (UX only) |
| Agent | None | Checked full-file edit + SHA256 + manual | Optional companion only |
| Log / diagnostics | Structured Log + first fatal + jump; static lint | Structured Log, first fatal, click-to-source | **Done (A1/A4)** |
| Stale PDF | Keep last good + stale badge | Keep last good PDF + stale badge | **Done (A2)** |
| Go-to-ref | Cmd/Ctrl+click follow + sidebar | Cmd/Ctrl+click `\cite`/`\ref`/`\input`/`\includegraphics`/`\url` | **Done (A3)** |
| Static lint | Dup label / undef cite·ref + CM lint | Undefined cite/ref, duplicate `\label` | **Done (A4)** |
| Cite complete | Title/authors + Labels tab | Title + authors in completion | **Done (A5)** |
| Project search | Ctrl/⌘+Shift+F + disk write-back | Multi-file search + replace preview | **Done (A6)** |
| Review | UI-only comments (collab) | Review as LaTeX macros (Git-visible) | Explore (A7) |
| TreeWriter / TLDR | Outline only | Paper-level summaries + in-place leaf edit | Later |
| Markdown | No | Edit + sanitized GFM preview | Later |

### Absorption backlog (client-compatible)

**A1 (P0):** Structured **Log** panel — promote first fatal error; group errors/warnings; click jumps to file+line (reuse/strengthen existing `parseLog`). ✅ structured Diagnostics + Raw log in Log tab

**A2 (P0):** **Stale PDF** — keep last successful preview while editing; mark stale until next successful compile; never present a failed build as a fresh PDF. ✅

**A3 (P1):** **Cmd/Ctrl+click follow** for `\cite` / `\citep` / `\citet` / `\ref` / `\autoref` / `\cref` / `\eqref` / `\input` / `\include` / `\includegraphics` / `\url` (LatexCoder `referenceLinks` pattern). ✅

**A4 (P1):** **Static diagnostics** before compile — duplicate labels, undefined refs/cites (LatexCoder `latexDiagnostics`); surface in Log + editor marks. ✅ Warnings/Log + CodeMirror lint gutter/underlines

**A5 (P1):** Richer **citation completion** (title/authors from `.bib`) and `\label`/`\ref` browse in **References**. ✅

**A6 (P2):** Project-wide **search / replace with preview** (in-memory; no ripgrep/sandbox needed in browser). ✅ + write-back to disk when a folder project is open

**A7 (explore):** Review/comments as **LaTeX macros** so Git and future agents see the same review state (fits TeXbrain’s “source is truth” story better than opaque UI state).

**Explicit non-goals from LatexCoder:** admin panel, SSH Git listener, server compile queue, Agent HTTP protocol, capability share sessions, bubblewrap search — unless TeXbrain later adds an *optional* self-hosted companion (separate product surface).

## Current priorities (2026)

### Recently shipped (editor)

- Tabbed sidebar: **Files**, **Outline** (section tree + `\input` / `\include`), **References** (citation keys + numbered equations)
- Click-to-jump and Ctrl/⌘+click-to-insert for cites and equations; project-wide `\cite{…}` / `\eqref{…}` autocomplete
- BusyTeX: second XeLaTeX pass for cross-references; SyncTeX / PDF viewer robustness improvements in the same release line
- **A1–A6 (from LatexCoder):** structured Log (first fatal + click-to-source), stale PDF badge, Cmd/Ctrl+click follow for cite/ref/input/include/includegraphics/url, static diagnostics (dup label / undef cite·ref), richer cite + `\label`/`\ref` in References + autocomplete, project search/replace preview (Ctrl/⌘+Shift+F)

Still open: rename/refactor across files; TreeWriter / review macros (A7).

### P0: Stability and predictability

- compile-target consistency in multi-main-file projects (Active Tab / Entry Point)
- preview/export consistency (especially CJK fonts, annotation layer, text layer)
- better observability across BusyTeX / SwiftLaTeX paths
- clearer error categories (LaTeX error, font issue, path issue, citation issue)

### P1: LaTeX workflow enhancements

- improve capability boundaries and hints for BibTeX / biblatex / biber
- incremental compile and caching strategy for larger projects
- stronger templates/scaffolds (thesis, journal, Chinese writing)
- safer rename/refactor across `\input` / `\include` and label keys

### P2: Editing experience enhancements

- Vim mode (start with core behavior, then move toward vimtex-like workflows)
- more configurable command palette and keybindings
- structure-aware navigation beyond the shipped **Outline** tab (symbols, TreeWriter-style paper view)
- extensible snippets and completion patterns
- review-as-LaTeX-macros (A7) if collaboration needs Git-visible comments

## Mid-/long-term exploration

## 1) Vim / vimtex-like experience (medium-to-large)

Goal is not to run Neovim plugins directly in-browser, but to deliver equivalent workflows incrementally:

- Phase 1: core Vim keymap and mode switching
- Phase 2: LaTeX-specific actions (environment editing, reference jumps, text objects)
- Phase 3: quickfix/jump/view linkage for fuller workflow coverage

Expected to be iterative work over multiple months.

## 2) Collaboration editing (large)

- room permissions (read-only / writable)
- conflict visibility and recovery
- compile state/result synchronization strategy
- performance and resource constraints

## 3) Plugin-oriented extensibility (large)

- extension interfaces for commands, snippets, templates
- controlled sandbox and security model
- compatibility/versioning strategy

## 4) Richer deployment forms (medium-to-large)

- static deployment best practices (CDN, cache, resource warm-up)
- optional desktop shell and local-file UX enhancements
- enterprise/school intranet deployment scenarios

## Suggested rolling milestones

- M1 (~1-2 months): stabilize compile target behavior, improve observability
- M2 (~2-3 months): stronger editing workflows (remaining ref/label tooling, templates)
- M3 (~3-6 months): Vim phase 1 + better collaboration capabilities
- M4 (long term): extensibility/plugin ecosystem

> Timeline is a rough range and depends on contributor bandwidth.

## How to collaborate (PRs welcome)

Contributions are welcome in:

- **Issue reports**: minimal repro, logs, browser/OS information
- **Feature proposals**: use cases, expected behavior, alternatives considered
- **Code contributions**: align scope in Issue/Discussion first, then open PR
- **Docs and tests**: sample projects, regression cases, failure notes

Please include:

- context and objective
- non-goals (what is explicitly out of scope)
- compatibility impact
- fallback plan if a rollout causes regressions

## Open discussion topics

- Vim scope boundaries: what to do first vs later
- default UX for Chinese/multilingual writing (font/template strategy)
- BusyTeX asset strategy (size, load, cache, maintainability)
- baseline suite for preview/compile consistency (sample document set)

---

If you want to help, open an Issue or PR.  
Long-term projects benefit most from small, continuous, verifiable improvements.

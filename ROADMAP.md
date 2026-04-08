# TeXbrain Future Roadmap (Draft)

> This is a long-term roadmap, not a short-term promise list.  
> Contributions are welcome in planning, implementation, and testing.

## Why this roadmap exists

TeXbrain already covers the core browser workflow (edit + compile + Git), but there is still substantial engineering work ahead to evolve it into a stronger writing tool (editor UX, compiler ecosystem, collaboration, maintainability, browser compatibility).

This document is used to:

- align future direction and reduce repeated discussion
- break work into incremental milestones for collaboration
- clarify short-/mid-term goals vs long-term exploration

## Current priorities (2026)

### P0: Stability and predictability

- compile-target consistency in multi-main-file projects (Active Tab / Entry Point)
- preview/export consistency (especially CJK fonts, annotation layer, text layer)
- better observability across BusyTeX / SwiftLaTeX paths
- clearer error categories (LaTeX error, font issue, path issue, citation issue)

### P1: LaTeX workflow enhancements

- improve capability boundaries and hints for BibTeX / biblatex / biber
- incremental compile and caching strategy for larger projects
- stronger templates/scaffolds (thesis, journal, Chinese writing)
- label/ref/cite navigation and safer rename flow for `\input` / `\include`

### P2: Editing experience enhancements

- Vim mode (start with core behavior, then move toward vimtex-like workflows)
- more configurable command palette and keybindings
- structure-aware navigation (outline, symbols, error linkage)
- extensible snippets and completion patterns

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
- M2 (~2-3 months): stronger editing workflows (navigation/ref/template)
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

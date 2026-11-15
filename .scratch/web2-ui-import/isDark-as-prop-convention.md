# Deferred: `isDark`-as-prop on presentational components

**Status:** `needs-triage` (deferred — reverted in `import/web2-ui` for consistency)
**Source:** `digis-web2` `export/` (Figma Make), branch `import/web2-ui`

## What
The Figma Make export delivers its components as **pure presentational leaves**: instead of
reading the theme from context (`useTheme()`), they take `isDark: boolean` (and
`isAuthenticated: boolean`) as props. This is deliberate on their side — a component that takes
its theme as a prop can be rendered/tested without the app's `ThemeProvider`.

## Why we reverted it (for now)
It was applied to 6 components (`Navigation`, `SearchBar`, `LocationSelector`,
`discovery/EmptyState`, `discovery/FilterPanel`, `discovery/CategoryFilter`) but the other
~70 theme-aware components still call `useTheme()`. That leaves **two conventions coexisting**,
which is ambiguous for the next reader/agent — worse than either convention applied consistently.

Reverting keeps one convention (Design A: look it up) until we decide.

## The two designs, concretely
- **A — look it up:** `const { isDark } = useTheme()` inside the component. Caller writes
  `<Navigation />`. Simple; needs `ThemeProvider` around it.
- **B — be told:** `isDark` in `NavigationProps`; caller writes `<Navigation isDark={isDark} />`.
  Free-standing (testable/reusable without the provider); but the caller must supply the right
  value, and deeply-nested components cost prop-threading.

Both update correctly on toggle: A re-renders via context subscription; B re-renders because the
parent (e.g. `router.tsx`, which calls `useTheme()`) re-renders and passes the new value.

## Decision needed
Pick **one**, then either:
1. **Revert all 6 to A** (uniform `useTheme`) — current state, simplest.
2. **Adopt B + document the boundary** — e.g. in `CONTEXT.md` / `AGENTS.md`:
   *"presentational leaves take `isDark`; shells/pages read theme context."*

Do **not** re-apply B piecemeal without the rule — that recreates the ambiguity.

## Revert reference
Reverted commit: `9b0398b` (`refactor(ui): isDark-as-prop for …`). The 6 components + 4 call
sites (`HeroSearch`, `router.tsx`, `EventGrid`, `DiscoveryPage`).

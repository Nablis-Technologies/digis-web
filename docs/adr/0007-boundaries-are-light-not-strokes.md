# 0007 — Boundaries are light, not strokes

Digis draws no decorative CSS `border`. A boundary is made of the glass
treatment instead: a filled surface plus a reflected-light layer. This reverses
the earlier mandate (card/input/chip "1px hairline", secondary button border)
in `DESIGN.md`.

The glass system already carried the boundary; the hairline was a duplicate
that fought it. Removing the stroke leaves one depth language:

- **Surfaces** (cards, sheets, panels): `glass(isDark, tint?)` for the fill,
  plus the `GlassReflection` overlay pair (`glassReflection()` bloom +
  `glassEdgeReflection()` masked conic edge) on a `relative overflow-hidden`
  host. The edge becomes travelling light, not a painted line.
- **Compact controls** (inputs, icon squares, small buttons, pills): `glass()`
  fill + `glassEdge(isDark)` (inset top light + quiet shadow). No room for an
  overlay, so the inset highlight is the whole edge.
- **State** is carried by the tint, never a stroke: selected/active =
  `glass(isDark, 'accent')`; error/destructive = `glass(isDark, 'danger')` with
  red icon + copy. A failure still cannot look like success — danger keeps its
  red fill, glyph, and text.
- **Dividers** become spacing, or a `glassEdge` inset light on the following
  block when a separator is load-bearing.

Exempt — `border` stays where it is the mechanism, not decoration:

- Rotation/progress rings (`border-top-color` spinner math).
- Ticket perforation (dashed) and punched notches — the Stub Geometry Rule.
- Seat-map state dots and legend swatches — border encodes seat data.
- Skeleton outlines — they mirror real surfaces (`Skeleton.tsx`).

_Considered:_ keep hairlines as an "inset highlight" only (current
`glassEdgeReflection`). Rejected as the sole answer because broad surfaces need
the travelling conic edge, and inputs/icon tiles need a fill contrast step that
a lone hairline cannot give. _Considered:_ a `border: 1px solid transparent`
shim. Rejected — it is a stroke with extra steps; use the fill.

Consequences: `src/lib/ui/glass.ts` gains `glassControl(isDark, tint?)`
(`glass()` fill composed with `glassEdge()`). Every live `border` that is
cosmetic is converted; functional exceptions above are left intact. Existing
`--border` theme tokens and shadcn `src/components/ui/**` (dormant, unstyled at
call sites) are untouched.

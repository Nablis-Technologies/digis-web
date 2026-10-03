---
name: Digis
description: Phone-first Ethiopian event ticketing — dark, lime, ticket-stub craft.
colors:
  digis-lime: "#d6f905"
  lime-ring: "#9db700"
  night-bg: "#08090b"
  night-card: "#101115"
  night-text: "#f4f4f0"
  night-muted: "#aaa9ae"
  night-line: "#3b3b3b"
  paper-bg: "#f3f1f7"
  paper-card: "#f8f7fa"
  paper-ink: "#17161c"
  paper-muted: "#6d6976"
  ink: "#0a0a0a"
  danger: "#c7344f"
  tier-emerald: "#34d399"
  tier-blue: "#60a5fa"
  tier-violet: "#c4b5fd"
  tier-gold: "#fac83c"
  tier-rose: "#fb7185"
typography:
  display:
    fontFamily: "'Zalando Sans Expanded', system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "normal"
  headline:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.094rem"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  interactive: "16px"
  card: "24px"
  modal: "28px"
  sheet: "32px"
components:
  button-primary:
    backgroundColor: "{colors.digis-lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.interactive}"
    padding: "16px"
  button-primary-hover:
    backgroundColor: "{colors.digis-lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.interactive}"
    padding: "16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.night-text}"
    rounded: "{rounded.interactive}"
    padding: "14px"
  input-field:
    backgroundColor: "rgba(255, 255, 255, 0.04)"
    textColor: "{colors.night-text}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  glass-overlay:
    backgroundColor: "transparent (light-only overlay pair, never a fill)"
    textColor: "n/a — aria-hidden"
    rounded: "inherit"
    padding: "0"
---

# Design System: Digis

## Overview

**Creative North Star: "The Lime Stub"**

Digis looks like the thing it sells: a ticket stub, held up to the light. Near-black surfaces carry honest paper-ticket motifs — perforation dashes, side notches, faux barcodes, countdown badges — while a single electric lime does all the talking that color needs to do. Nothing gradients for decoration; nothing glows to impress. The energy comes from the night market, the trust from verification marks, guarantees, and QR proof.

Density is thumb-first: full-width CTAs, bottom sheets, a bottom nav with safe-area padding, generous card radii that survive small screens. Type is scannable and confident — short labels, tracked-out uppercase microcopy, numerals set wide. Motion is physical, never ambient: springy taps, sheets that slide, menus that pop, shimmer only where payment deserves ceremony.

**Key Characteristics:**
- Dark-first; light theme is a faithful inversion, never an afterthought.
- One accent (Digis Lime); every other hue carries data (category, price rank, countdown state).
- Ticket-stub geometry: dashes, notches, perforation, barcodes.
- Tactile motion: scale taps, spring sheets, staggered entrances.
- Glass chrome: navigation and menus float on blur, not shadow.
- Non-invasive light: reflection overlays add bloom and hairline without touching fills.

## Colors

One accent on near-black (or paper), with data hues kept strictly in their lane.

### Primary
- **Digis Lime** (#d6f905): The only accent. Primary CTAs, active nav states, focus rings, verified marks, countdown badges, the brand mark. On dark it stays lime; on light it steps aside for ink (see rules).

### Tertiary
- **Tier Emerald** (#34d399), **Tier Blue** (#60a5fa), **Tier Violet** (#c4b5fd), **Tier Gold** (#fac83c), **Tier Rose** (#fb7185): Price-rank accents for ticket tiers (cheapest emerald → priciest gold) and countdown/state tints. Data only — never chrome, never CTAs. Each ships a deeper ink shade for light mode (emerald #047857, blue #1d4ed8, violet #6d28d9, gold #9a6a00, rose #be123c).

### Neutral
- **Night** (#08090b bg / #101115 card / #f4f4f0 text / #aaa9ae muted / #3b3b3b line): The default world. Cards sit on near-black as translucent glass, bounded by reflected light — never a painted hairline (ADR-0007).
- **Paper** (#f3f1f7 bg / #f8f7fa card / #17161c text / #6d6976 muted): The light inversion. Same glass boundary, same radii, deeper drop shadows to compensate for lost contrast.
- **Ink** (#0a0a0a): CTA text on lime, light-mode primary surfaces, the brand mark on light.
- **Danger** (#c7344f): Errors, destructive actions, live-now badges (dark destructive deepens to #7f2638).

### Named Rules
**The One Accent Rule.** Digis Lime is the only accent. Category and tier hues carry data; they never paint chrome, buttons, or navigation.
**The Lime Legibility Rule.** Lime text lives on dark. On light, lime becomes ink (#0a0a0a): nav icons, ticket accents, and active states all make the swap. Never set lime type on paper.
**The Quiet Ownership Rule.** Surfaces for tickets already owned stay neutral (white 4.5% on dark); lime appears only in their small status cues, so owned tickets never compete with event cards.

## Typography

**Display Font:** Zalando Sans Expanded (self-hosted, weights 300–800)
**Body Font:** Inter (self-hosted, weights 300–700)
**Label/Mono Font:** Inter (no distinct mono; numerals in countdowns and OTP use the display face)

**Character:** Zalando speaks for moments — brand, numerals, countdowns, one-time codes. Inter speaks for everything else: prices, forms, sentences. Wide, engineered display against a neutral grotesque body.

### Hierarchy
- **Display** (600, 19–20px for OTP numerals, 9px tracked for countdowns): Brand moments, ticket serials, countdown badges, one-time-code boxes. Never body copy.
- **Headline** (500, 1.5rem/2rem, 1.5 line-height): Page and section titles (h1 base).
- **Title** (500, 1.125–1.25rem, 1.5 line-height): Card titles, sheet titles (h2–h3 base).
- **Body** (400, 0.875–1rem, 1.5 line-height): Descriptions, form values, sentences. Dense event meta may drop to 13px.
- **Label** (600, 0.625rem, 0.094rem tracking, uppercase): Field labels, eyebrows, badge microcopy. CTAs use 14px/500 with 0.5px tracking instead — labels instruct, buttons invite.

### Named Rules
**The Two Voices Rule.** Zalando for moments, Inter for everything else. Display type is never Inter — that swap is the fastest way to make a screen feel generic.

## Layout

Mobile-first single column that widens into zones: full-bleed feed on phones (`px-4`), then `max-w-7xl` chrome, `max-w-6xl` wallet, `max-w-5xl` profile, `max-w-2xl` reading surfaces (settings, event body), `max-w-lg/md/sm` modals. Event grids go 2-up at medium, 3-up at large, 4-up at extra-large with 16–20px gaps.

Chrome is fixed and floating: bottom tab bar on mobile (with safe-area padding), top bar on desktop (72px, centered pills). Sheets and drawers slide from the bottom on mobile and center as modals on larger screens. Overlays stack on a fixed z-ladder (chrome 30 → overlay 100 → viewer 140 → celebration 200 → auth 300), so purchase, payment-return, and auth flows always win.

Spacing rhythm is Tailwind's 4px base with 12/16/24px doing the structural work: 16px card padding, 24px card radii, 16px CTA radii, full-round pills for anything that filters or counts down.

## Elevation & Depth

Depth is blur plus translucency, not shadow. Navigation bars, search fields, menus, and dropdowns float on backdrop glass (20–60px blur, saturate 1.5–1.8×) over tinted scrims; reflected-light edges and inset top-highlights separate the layers. Drop shadows exist but stay quiet and purposeful.

### Shadow Vocabulary (if applicable)
- **Card rest** (`0 16px 40px -20px rgba(0,0,0,0.7)` dark / `0 12px 32px -18px rgba(0,0,0,0.2)` light, each with an inset top hairline): Event and ticket cards at rest.
- **Floating chrome** (`0 8px 32px rgba(0,0,0,0.35)` bar / `0 -8px 32px rgba(0,0,0,0.25)` tab bar): The fixed nav never touches content.
- **Sheets and menus** (`0 -20px 80px rgba(0,0,0,0.5)` sheets / `0 16px 40px rgba(0,0,0,0.5)` menus): Overlays announce themselves with height, not borders.
- **Badges** (`0 8px 20px rgba(0,0,0,0.3)`): Countdown and date badges lift off artwork so type stays readable.

### Named Rules
**The Layered Glass Rule.** Blur and translucency are the depth system; shadow is the exception. If a surface needs to float, reach for glass first. On top of the blur, a
calibrated reflection layer adds the light: every glass host carries an
overlay pair — a `glassReflection()` bloom (radial pool + directional wash +
top edge fade) at `z-0`, and a `glassEdgeReflection()` one-pixel conic
hairline at `z-1` whose mask removes the center so it can never tint the
surface. Content always sits at `z-10`. The approved balance
(`src/lib/ui/glass.ts`) is deliberately quiet on broad panels — hairline
0.05, edge light 0.02, bloom 0.145 — with light-mode multipliers so the same
settings read on paper. Overlays never replace a card's own color, image,
transparency, or blur; shadow is computed separately (`glassShadow()`) so
elevation never changes a fill. Compact elements that cannot host an overlay
get only the restrained inset hairline (`glassEdge()`). Overlays accept three
tints — none (white light), accent lime, danger — and the `/ui-preview`
calibration page exists so new surfaces are tuned against the real
event-detail modules, not guessed.
**No Painted Borders (ADR-0007).** The reflected edge *is* the boundary; a CSS
`border` is never decoration. Surfaces carry the overlay pair, compact controls
carry `glassEdge()` (inset top light), and state is told through the glass tint
— never a stroke. `border` survives only where it is the mechanism: **input
fields (a thin hairline is the affordance that separates a well from a
button)**, spinner rings, ticket perforation dashes, seat-map data dots,
skeleton shells. Buttons compose `glassControl(isDark, tint?)`; fields compose
`glassField(isDark, { error, focused })`.
**The Quiet Shadow Rule.** Primary CTAs carry no shadow at all. Shadows answer only to state — hover lift, open sheets, floating chrome.

## Shapes

Chunky, friendly, thumbable. Interactive elements take a 16px radius (buttons, search, ticket rows); inputs and icon tiles take 12–14px; containers step up to 24px cards, 28px modals and share cards, 32px bottom sheets. Anything that filters, counts, or navigates is a full pill. Ticket motifs — dashed perforation dividers, punched side notches, faux barcodes — are the only permitted ornament, and they always mean "ticket".

**The Stub Geometry Rule.** Dashes, notches, and barcodes always mean ticket. Never use perforation styling on non-ticket surfaces.

## Components

### Buttons
Tactile and confident: chunky, lime, begging to be pressed.
- **Shape:** Fully 16px radius (rounded-2xl), full-width, 16px vertical padding.
- **Primary:** Digis Lime gradient (`135deg, #d9ff00 → #d6f905`), ink text, 14px/500–600 with 0.5px tracking. No shadow. Taps scale 1.01/0.98; auth primary adds a slow diagonal shimmer.
- **Hover / Focus:** Subtle scale only — no color shift, no glow. Focus is a 4px lime halo at 10% opacity on inputs, not buttons.
- **Secondary / Ghost:** Transparent on the inset glass edge (`glassEdge()`), same 16px radius — no painted border; ticket-context secondaries sit on blurred panels. Disabled uses flat translucent surfaces at full opacity — never `opacity-50`.

### Chips (if used)
- **Style:** Full pills; category pills pair a Lucide glyph with the category hue, readable-adjusted per theme (lifted on dark, deepened on light).
- **State:** Active filter pills fill with lime (dark) or ink (light); inactive pills are glass (`glassEdge()`, inset light — no painted border).

### Cards / Containers
- **Corner Style:** 24px event cards, 22px ticket rows, 28px detail modals.
- **Background:** Near-black `#101010`–`#101115` on dark, white–`#f8f7fa` on light; ticket detail modals deepen to `#0c0a18`.
- **Shadow Strategy:** Card-rest shadow only (see Elevation); depth otherwise comes from the 3px poster-hue accent edge on ticket rows.
- **Edge:** reflected light, not a stroke — the `GlassReflection` overlay pair on the host, or `glassEdge()` inset top light on compact elements (ADR-0007).
- **Internal Padding:** 12–16px; card footers breathe with 14px top padding.

### Inputs / Fields
- **Style:** 12–14px radius, `glassField()` — the full discovery-search chrome on every field: translucent surface + 40px backdrop blur + the reflected hairline (a border-box conic gradient, the same one-pixel edge the search bar paints) + the quiet float shadow. 14px Inter values, tracked-out 10px uppercase labels.
- **Focus:** The hairline turns lime (ink-adjacent on light) with a soft 4px halo; error turns it red with a red halo (the message under the field still carries the failure). The hairline is the one ADR-0007 exception — a field's edge is the affordance that separates an editable well from a borderless button.
- **Error / Disabled:** Error takes the danger glass tint + red hairline (`glassField(isDark, { error })`) with a red icon and message; disabled fields use the flat translucent disabled surface (no ring). OTP uses six discrete boxes with lime fill rings; there is no backend OTP — codes shown are display-only patterns.

### Navigation
- **Style:** Mobile bottom tab bar (glass, a soft lime light edge, safe-area padded) vs desktop fixed top bar (72px, centered pill group, blur 48px). Active mobile item gets a shared-layout lime pip; active desktop pill fills lime-tinted glass.
- **Typography:** 10px tracked labels on mobile, 12px tracked pills on desktop; icons at 22px, 1.5 stroke.
- **States:** Taps compress to 0.88; scroll past 12px deepens the glass. Notification dots are red `#ef4444` pills with a page-background ring.

### Ticket Stub (signature component)
The system's signature: dashed perforation dividers, punched side notches over page background, faux barcodes, deterministic serials, countdown badges, and three share-card finishes (spotlight mesh, after-dark full-bleed, ticket-cut stub). QR entry codes sit on 8–12px radius beds; zoom and foil sweeps are celebratory, never structural. The event-detail "your ticket" access card is the exception that proves the accent's rarity: neutral fill, lime only in its status cues.

### Glass Overlay (reflection pair)
Non-invasive light for `relative overflow-hidden` hosts: the `GlassReflection` primitive (`src/components/primitives/GlassReflection.tsx`) renders a bloom/wash/fade layer at `z-0` plus a masked one-pixel conic hairline at `z-1`; content stays at `z-10`. Approved defaults live in `src/lib/ui/glass.ts` (hairline 0.05, edge 0.02, bloom 0.145; light-mode multipliers included). It never replaces the host's color, image, transparency, or blur — tune new surfaces on the `/ui-preview` calibration page against the real modules, never by guessing values.

## Do's and Don'ts

### Do:
- **Do** paint every primary action Digis Lime with ink text — its rarity is the point.
- **Do** swap lime type to ink on light surfaces (nav, ticket accents, active states).
- **Do** use perforation, notches, and barcodes to say "ticket" — they are the brand's ornament.
- **Do** keep touch targets at 36–44px and CTAs full-width on phones.
- **Do** default to dark; persist the visitor's theme choice.
- **Do** honor `prefers-reduced-motion` for loops (pulse, shimmer, countdown blink) — the system animates constantly and currently has no reduced-motion handling; new work must not extend that gap.
- **Do** tune new reflective surfaces on the `/ui-preview` calibration page against the real modules — never guess reflection values.
- **Do** build every boundary from light: glass fill + reflection, `glassEdge()` on compact controls, the tint for state (ADR-0007).

### Don't:
- **Don't** use purple-to-blue gradients or cyan-on-dark washes — the system's most recognizable anti-pattern (flagged by the detector in legacy mock files).
- **Don't** set display type in Inter — headlines, numerals, and countdowns belong to Zalando.
- **Don't** put shadows on primary CTAs — they are flat lime, full stop.
- **Don't** fake disabled states with `opacity-50` — use the flat translucent disabled surfaces.
- **Don't** invent testimonials, press, pricing, or partner claims — no such evidence exists.
- **Don't** paint chrome (buttons, nav, inputs) in category or tier hues — data colors stay on data.
- **Don't** wash owned-ticket surfaces in lime — neutral fill, lime only in status cues.
- **Don't** let a reflection overlay replace a fill, image, blur, or transparency — it adds light, nothing else.
- **Don't** paint a CSS `border` as a boundary — the boundary is light (ADR-0007). Border stays only as a mechanism: spinner ring, ticket perforation, seat-map data dot, skeleton shell.

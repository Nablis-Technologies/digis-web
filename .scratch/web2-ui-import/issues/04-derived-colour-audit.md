# 04 — Data-derived colour inventory (find "random colours like this")

**Opened:** 2026-10-17 · **Status:** open (findings recorded; the sheet fix landed)

## Trigger

Prompt: *"why is the venue profile blue gradient background"* → *"lets just do
dark/light background. find other areas using random colors like this."*

The venue sheet's blue came from `artworkPalette(null, isDark)` falling back to
`BRAND_HUE = 247` — an **indigo** ported verbatim from the web2 export's
`FALLBACK_PALETTE`, not the Digis lime (`#d6f905` ≈ hue 69). `DESIGN.md` names
this outright: *"Don't use purple-to-blue gradients or cyan-on-dark washes — the
system's most recognizable anti-pattern."*

**Fixed (2026-10-17d):** the three profile sheets now render the plain app
surface (`var(--card)`; night `#101115` / paper `#f8f7fa`). `artworkPalette.ts`
(+ test) and `SheetEnvironment.tsx` are deleted. See `INTEGRATION_STATUS.md`.

## The rule this file is auditing

Colour that is **not** a theme token and **not** a documented data hue — i.e.
generated at runtime (from an image), hashed from a name, or a hand-picked
arbitrary gradient "world" — is what the user wants replaced with the app's
dark/light surfaces. `DESIGN.md` allows exactly one accent (Digis Lime) plus
**tier** data hues (emerald/blue/violet/gold/rose, line 106) kept "strictly in
their lane".

## Inventory — remaining "random colour" surfaces

### A. Extracted from artwork at runtime (poster/portrait dominant colour)

| Where | Evidence | What it tints |
|---|---|---|
| `lib/hooks/useImageColor.ts` | `FastAverageColor`, algorithm `dominant`, saturation boost | the shared source for the below |
| `lib/hooks/useProminentHue.ts` (+ `features/discovery/hooks/useProminentHue.ts`) | wraps the extracted rgb into a readable hue | featured/discovery + share cards |
| `components/EventCard.tsx:283` | `const { rgb } = useImageColor(event.image)` | date badge accent + `getCategoryColor(event.category, rgb)` fallback |
| `features/discovery/components/FeaturedEventCard.tsx:30,35` | `useImageColor` → `useProminentHue(event.image, rgb, isDark)` | headline chip, glow, badge |
| `features/discovery/components/FeaturedMagazine.tsx:75,76` | `useImageColor` + `useProminentHue(...)` | hero date chip |
| `features/resale/components/ResaleEventCard.tsx:20` | `useImageColor(group.image)` | resale card accent |
| `features/tickets/components/ShareCard.tsx:49,50` | `useImageColor` → `useProminentHue(event.image, rgb, true)` → `hued`/`secondTone` | the whole share-card colour world (`ShareCardParts.tsx`) |
| `features/tickets/components/GlassTicketCard.tsx:15` | `useImageColor(ticket.image)` | ticket-card accent |
| `features/tickets/components/DetailedTicket.tsx:119` | `useImageColor(ticket.image)` | wallet ticket detail accent |
| `features/tickets/components/DownloadableTicketCard.tsx:5` | `useImageColor` | downloadable ticket art |
| `features/event-detail/hooks/useDominantColor.ts` | canvas average of the poster | source for the page backdrop |
| `features/event-detail/components/ImmersiveBackdrop.tsx` | blurred poster + 3 radial washes from `posterRgb`, **whole event-detail page background** | page environment |
| `features/event-detail/pages/EventDetailPage.tsx:80,82,209,223,232` | `posterRgb` (+ `rgb`) → `ImmersiveBackdrop`, `EventHero`, `InfoCardsGrid` | hero + info-card tints |

### B. Hashed to a fixed palette ("random" per name)

| Where | Evidence | Notes |
|---|---|---|
| `lib/utils/avatarColor.ts` | 12-colour `PALETTE` (`#ef4444`…`#e11d48`) hashed from the seed | the green "TV" avatar still visible in the venue sheet |
| consumers | `VenueMap.tsx`, `OrganizerSection.tsx` (×4), `LineupSection.tsx:95`, `components/UserAvatar.tsx:64`, `features/profile/pages/SettingsPage.tsx:161` | every avatar without a photo |

### C. Fixed per-category hues (`lib/categoryColors.ts`)

14 hard-coded category hexes (`Music #a855f7`, `Film #3b82f6`, …) + a
lightness-shift for contrast. Used by discovery pills, the event-card category
badge, hero chips. `DESIGN.md:92` explicitly sanctions these — *"every other hue
carries data (category, price rank, countdown state)"* — so this is a documented
data-hue lane. **Leave.**

### D. Hand-picked gradient "worlds"

| Where | Evidence | Notes |
|---|---|---|
| `features/tickets/components/TicketsEmptyState.tsx:53-84` | violet `#a78bfa/#6d28d9`, cyan `#22d3ee/#0e7490`, lime `#e9ff4d/#b6dd00` | decorative demo ticket tiles |
| `features/tickets/components/GiftTicketOptions.ts:8-24` | 3 dark gradients | gift-tier thumbnails |
| `features/checkout/components/SuccessView.tsx:70-71` | green `#34d399 → #10b981` | success CTA — green is not an accent in `DESIGN.md` (Tier Emerald is *data only*) |
| `features/auth/components/AuthModal.tsx:328` | green `#34d399 → #10b981` | same |
| `lib/mock/events.ts:127-430` | `from-purple-500`, `from-indigo-500`, `from-violet-500`… | **dead file** (unimported) — the detector's "legacy mock files" |
| `features/ui-preview/pages/UIPreviewPage.tsx:90-92` | demo gradients | preview surface only |

### E. Sanctioned / brand (leave alone)

- `TicketTypeCard.tsx` tier accents (emerald/rose/violet/gold/blue) — `DESIGN.md`
  line 106 data hues.
- Lime gradients (`router.tsx`, `loading.tsx`, `TicketsPage.tsx`, `WaitlistSheet`,
  `ScheduleSections`, `CheckoutPage`, `ClaimTicketPage`) — the brand accent.

## Recommendation

Group **B** is the cheapest, most clearly-in-scope change (a hashed 12-hue
palette → one theme/brand tile) and it is the same "colour out of nowhere"
pattern as the sheet. Group **A** is the biggest visual surface (discovery cards,
share cards, the whole event-detail backdrop); neutralising it is a real design
change and wants the user's sign-off per surface. Groups **C**/**D** are
intentional decorative lanes — leave unless the user says otherwise.

Tracked, not backend gaps.

# Glass effect — element index

Generated inventory of every place the glass system is used, and how.
Source of truth for the API: `src/lib/ui/glass.ts`. Rule: **ADR-0007** (boundaries
are light, not strokes). Design authority: `DESIGN.md` → *Layered Glass Rule* /
*No Painted Borders*.

Regenerate the raw data with the throwaway scanners used to build this doc
(`index-glass.cjs`, `index-glass2.cjs`), or just grep:

```
rg -l "lib/ui/glass" src          # files importing the API
rg -l "<GlassReflection" src      # files rendering the overlay pair
```

## The API layers (what each one is)

| Function | Layer | Used on | Count |
|---|---|---|---|
| `glass(isDark, tint?)` | fill | broad surfaces | 13 |
| `glassReflection(isDark, tint?, settings?)` | bloom + wash + edge fade overlay | broad surfaces (via primitive) | 7 direct |
| `glassEdgeReflection(isDark, settings?)` | 0.5px conic reflected perimeter | broad surfaces (via primitive) | 6 direct |
| `GlassReflection` primitive | renders the reflection pair (2 spans) | any `relative overflow-hidden` host | **64 host files** |
| `glassShadow(isDark, settings?)` | soft elevation (separate from reflection) | cards | 2 |
| `glassEdge(isDark)` | inset top hairline + shadow | compact controls | **92** |
| `glassControl(isDark, tint?)` | `glass()` + `glassEdge()` | icon tiles / buttons / pills | **21** |
| `glassInputSurface(isDark)` | search-bar fill + 40px blur + float shadow | inputs | 2 |
| `glassField(isDark, {error,focused})` | input surface + focus/error inset ring | inputs | **42** |

Totals by usage: `glassEdge` 92 · `glassField` 42 · `glassControl` 21 · `glass` 13 ·
`glassReflection` 7 · `glassEdgeReflection` 6 · `glassShadow` 2 · `glassInputSurface` 2.

## Three approaches coexist

1. **Border** — rejected (`ADR-0007`). Legacy/raw `border:` still present in a few files (see hotspots).
2. **Inset** — `glassEdge` / `glassControl` — compact elements too small for an overlay.
3. **Conic reflection** — `GlassReflection` primitive (`glassReflection` + `glassEdgeReflection`) — broad surfaces.

## Files using glass, by import / primitive / API

`GLASS_IMPORT` = imports `@/lib/ui/glass`; `PRIMITIVE` = renders `<GlassReflection>`;
`API` = which functions it calls; `BACKDROP` = backdropFilter/blur occurrences;
`BORDERS` = raw `border:`/`borderColor:` occurrences (cosmetic → normalize, functional → keep).

| File | Import | Primitive | API | Backdrop | Borders |
|---|---|---|---|---|---|
| src/app/router.tsx | Y | | glass, glassControl | 2 | 0 |
| src/components/EventCard.tsx | Y | Y | glassShadow | 7 | 0 |
| src/components/loading.tsx | Y | | glassControl | 0 | 11 |
| src/components/LocationSelector.tsx | | Y | | 4 | 0 |
| src/components/Navigation.tsx | | Y | | 2 | 0 |
| src/components/primitives/GlassReflection.tsx | Y | | glassReflection, glassEdgeReflection | 0 | 0 |
| src/components/primitives/SegmentedToggle.tsx | Y | | glassEdge | 0 | 0 |
| src/components/SearchBar.tsx | Y | Y | glassField | 0 | 2 |
| src/components/TopBar.tsx | Y | Y | glassEdge | 10 | 4 |
| src/components/ui/dialog.tsx | | Y | | 0 | 0 |
| src/components/ui/drawer.tsx | | Y | | 0 | 0 |
| src/components/ui/popover.tsx | | Y | | 0 | 0 |
| src/components/ui/sheet.tsx | | Y | | 0 | 0 |
| src/features/auth/components/AuthModal.tsx | Y | Y | glassEdge, glassField | 2 | 3 |
| src/features/checkout/components/CheckoutSheetFrame.tsx | Y | Y | glassEdge | 2 | 0 |
| src/features/checkout/components/ConflictSheet.tsx | | Y | | 2 | 0 |
| src/features/checkout/components/ConsentSection.tsx | | Y | | 0 | 0 |
| src/features/checkout/components/DetailsStep.tsx | Y | Y | glassField | 0 | 0 |
| src/features/checkout/components/ExtrasOnlyCheckout.tsx | Y | Y | glassField | 0 | 1 |
| src/features/checkout/components/ExtrasStep.tsx | | Y | | 0 | 0 |
| src/features/checkout/components/PaymentStep.tsx | Y | Y | glassEdge, glassField | 0 | 0 |
| src/features/checkout/components/PhoneOtpStep.tsx | Y | Y | glass, glassControl, glassField | 0 | 1 |
| src/features/checkout/components/PromoCodeField.tsx | Y | Y | glassEdge, glassField | 0 | 0 |
| src/features/checkout/components/QuestionField.tsx | Y | Y | glassEdge, glassField | 2 | 0 |
| src/features/checkout/components/QuestionsStep.tsx | Y | Y | glassEdge | 0 | 0 |
| src/features/checkout/components/ReviewStep.tsx | Y | Y | glassEdge | 1 | 0 |
| src/features/checkout/components/SeatMapStep.tsx | Y | Y | glassEdge | 0 | 9 |
| src/features/checkout/components/SuccessView.tsx | | Y | | 0 | 0 |
| src/features/checkout/pages/CheckoutPage.tsx | Y | | glassControl, glassField | 0 | 0 |
| src/features/discovery/components/CategoryFilter.tsx | | Y | | 0 | 0 |
| src/features/discovery/components/CountdownBadge.tsx | | | | 2 | 0 |
| src/features/discovery/components/EmptyState.tsx | Y | Y | glass, glassEdge | 0 | 0 |
| src/features/discovery/components/FeaturedEventCard.tsx | | Y | | 1 | 0 |
| src/features/discovery/components/FeaturedMagazine.tsx | | Y | | 2 | 3 |
| src/features/discovery/components/FilterPanel.tsx | Y | | glassEdge | 0 | 0 |
| src/features/discovery/components/HeroSearch.tsx | Y | | glassEdge | 4 | 0 |
| src/features/discovery/components/PosterCarousel.tsx | | Y | | 0 | 0 |
| src/features/event-detail/components/EndedBar.tsx | | Y | | 2 | 1 |
| src/features/event-detail/components/EventHero.tsx | | Y | | 5 | 0 |
| src/features/event-detail/components/GatedTierGate.tsx | Y | Y | glassEdge, glassField | 0 | 0 |
| src/features/event-detail/components/ImageCarousel.tsx | | Y | | 0 | 0 |
| src/features/event-detail/components/InfoCards.tsx | Y | Y | | 4 | 0 |
| src/features/event-detail/components/InlineCountdown.tsx | Y | | glassEdge | 0 | 0 |
| src/features/event-detail/components/LineupSection.tsx | Y | Y | glassEdge | 3 | 0 |
| src/features/event-detail/components/OrganizerSection.tsx | Y | Y | glassReflection, glassEdgeReflection, glassEdge | 8 | 0 |
| src/features/event-detail/components/PurchaseBar.tsx | | Y | | 2 | 0 |
| src/features/event-detail/components/SoldOutBar.tsx | | Y | | 2 | 3 |
| src/features/event-detail/components/TicketSelector.tsx | Y | | glassControl | 0 | 0 |
| src/features/event-detail/components/TicketTypeCard.tsx | Y | | glassReflection, glassEdgeReflection | 0 | 0 |
| src/features/event-detail/components/VenueMap.tsx | Y | Y | glassReflection, glassEdgeReflection, glassEdge | 4 | 1 |
| src/features/event-detail/components/WaitlistSheet.tsx | Y | Y | glassControl, glassField | 2 | 0 |
| src/features/event-detail/components/YourTicketAccess.tsx | | Y | | 7 | 0 |
| src/features/event-detail/pages/EventDetailPage.tsx | | Y | | 0 | 0 |
| src/features/payouts/components/WithdrawPayoutSheet.tsx | Y | Y | glassEdge, glassControl, glassField | 1 | 0 |
| src/features/payouts/pages/PayoutsPage.tsx | | Y | | 0 | 0 |
| src/features/profile/components/SettingsAccountCard.tsx | | Y | | 2 | 0 |
| src/features/profile/components/SettingsPrimitives.tsx | Y | Y | glassEdge, glassField | 4 | 0 |
| src/features/profile/pages/ProfilePage.tsx | Y | Y | glassEdge | 2 | 0 |
| src/features/profile/pages/SettingsPage.tsx | Y | Y | glassEdge, glassControl | 2 | 0 |
| src/features/resale/components/BuyListingSheet.tsx | Y | Y | glassEdge | 1 | 0 |
| src/features/resale/components/FilterPanel.tsx | Y | Y | glassEdge | 0 | 0 |
| src/features/resale/components/ListingSuccessOverlay.tsx | Y | Y | glass, glassEdge | 2 | 0 |
| src/features/resale/components/PayoutMethodsSheet.tsx | Y | Y | glassEdge, glassControl, glassField | 1 | 0 |
| src/features/resale/components/RemoveListingSheet.tsx | Y | Y | glassEdge, glassControl | 4 | 1 |
| src/features/resale/components/ResaleEmptyState.tsx | Y | Y | glass, glassEdge | 0 | 0 |
| src/features/resale/components/ResaleEventCard.tsx | | | | 1 | 0 |
| src/features/resale/components/SellTicketSheet.tsx | Y | Y | glassEdge, glassControl | 1 | 0 |
| src/features/resale/pages/ResalePage.tsx | Y | Y | glassEdge, glassField | 2 | 0 |
| src/features/tickets/components/AddExtrasDialog.tsx | Y | Y | glassEdge | 2 | 1 |
| src/features/tickets/components/ClaimGuestSheet.tsx | Y | Y | glassField | 1 | 0 |
| src/features/tickets/components/DetailedTicket.tsx | Y | Y | glassControl | 6 | 2 |
| src/features/tickets/components/GlassTicketCard.tsx | | Y | | 0 | 8 |
| src/features/tickets/components/ShareCard.tsx | Y | | glassEdge | 1 | 1 |
| src/features/tickets/components/ShareCardParts.tsx | Y | | glassEdge | 0 | 2 |
| src/features/tickets/components/TicketsEmptyState.tsx | Y | Y | glass, glassEdge | 0 | 0 |
| src/features/tickets/components/TransferTicketDialog.tsx | Y | Y | glassEdge, glassControl, glassField | 2 | 2 |
| src/features/tickets/components/TransferTicketParts.tsx | Y | Y | glassField | 0 | 0 |
| src/features/tickets/pages/ClaimTicketPage.tsx | Y | Y | glassEdge, glassControl, glassField | 0 | 4 |
| src/features/tickets/pages/TicketsPage.tsx | Y | | glassEdge | 2 | 0 |
| src/features/ui-preview/pages/UIPreviewPage.tsx | Y | | glassReflection, glassEdgeReflection, defaultGlassSurface | 10 | 0 |
| src/lib/ui/glass.ts | — | — | (defines all) | 2 | 0 |

**Total files touching glass: 83** (excluding `src/imports/**`, which are dead Figma dumps).

## `GlassReflection` overlay hosts (64 files) — count of `<GlassReflection>`

OrganizerSection 10 · ResalePage 10 · ClaimTicketPage 10 · DetailedTicket 9 ·
SellTicketSheet 8 · EventHero 7 · LineupSection 7 · ProfilePage 7 · PayoutMethodsSheet 7 ·
TopBar 6 · VenueMap 6 · TransferTicketDialog 6 · AuthModal 5 · PayoutsPage 5 ·
ClaimGuestSheet 5 · QuestionField 4 · GlassTicketCard 4 · ExtrasOnlyCheckout 3 ·
FeaturedMagazine 3 · InfoCards 3 · WaitlistSheet 3 · WithdrawPayoutSheet 3 ·
SettingsPrimitives 3 · RemoveListingSheet 3 · EventCard 2 · LocationSelector 2 ·
SearchBar 2 · ConsentSection 2 · PaymentStep 2 · PhoneOtpStep 2 · PromoCodeField 2 ·
EmptyState 2 · FeaturedEventCard 2 · GatedTierGate 2 · EventDetailPage 2 · SettingsPage 2 ·
BuyListingSheet 2 · ResaleEmptyState 2 · TicketsEmptyState 2 · Navigation 1 ·
dialog/drawer/popover/sheet (shadcn) 1 each · CheckoutSheetFrame 1 · ConflictSheet 1 ·
DetailsStep 1 · ExtrasStep 1 · QuestionsStep 1 · ReviewStep 1 · SeatMapStep 1 ·
SuccessView 1 · CategoryFilter 1 · PosterCarousel 1 · EndedBar 1 · ImageCarousel 1 ·
PurchaseBar 1 · SoldOutBar 1 · YourTicketAccess 1 · SettingsAccountCard 1 ·
resale/FilterPanel 1 · ListingSuccessOverlay 1 · AddExtrasDialog 1 · TransferTicketParts 1

## Raw-border hotspots (normalize on import)

These files still carry cosmetic `border:` and are the primary targets for the
border→glass pass (functional borders — input focus/error, spinner rings, ticket
perforation/notches, seat-map dots, skeleton shells — stay):

| Border count | File |
|---|---|
| 11 | src/components/loading.tsx *(skeleton shells — mostly functional, review)* |
| 9 | src/features/checkout/components/SeatMapStep.tsx *(seat dots — functional)* |
| 8 | src/features/tickets/components/GlassTicketCard.tsx |
| 4 | src/components/TopBar.tsx |
| 4 | src/features/tickets/pages/ClaimTicketPage.tsx |
| 3 | src/features/auth/components/AuthModal.tsx |
| 3 | src/features/discovery/components/FeaturedMagazine.tsx |
| 3 | src/features/event-detail/components/SoldOutBar.tsx |

## How to keep it clean going forward

- New cosmetic boundary → `glassEdge` (compact) or the `GlassReflection` pair (surface). Never `border:`.
- New input → `glassField(isDark, { error, focused })` + a `GlassReflection` overlay on the wrapper.
- New icon tile / pill / small button → `glassControl(isDark, tint?)`.
- State → tint/fill, never a stroke.
- Functional `border` (spinner, perforation, seat map, skeleton) is the only exception — see ADR-0007.

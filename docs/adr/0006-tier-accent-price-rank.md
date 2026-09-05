# 0006 — Tier presentation accent is price-rank, not semantic-flag

Ticket tier colors are chosen by **price rank** (cheapest → emerald "deal",
priciest → gold "premium", middles alternate blue/violet), assigned in the
products adapter after the price sort. The four semantic flags
(`isEarlyBird` / `isCouples` / `isElite` / `isPremium`) drive **semantic UI**
(badges, shimmer, countdown, pair suffix) — they do **not** drive color.

Live backend tiers never set those flags, so a semantic-flag color cascade made
every tier render the same standard blue. Separating the two concerns means:

- `TicketTier.accent?: 'emerald' | 'rose' | 'violet' | 'gold' | 'blue'` is
  presentation-only; money and buyability come from the backend unchanged.
- `src/lib/tierAccents.ts` owns the palette + `resolveTierAccent` (explicit
  `accent` first, legacy flags as fallback) + `applyRankAccents` (pure, tested).
- Each accent carries a bright shade (dark mode) and an adjacent ink shade
  (light mode); `TicketTypeCard` uses the page theme (was hardcoded dark).

_Considered:_ color the tiers by their semantic flags (early bird always
emerald, VIP always gold). Rejected because live tiers have none of those
flags set, so the purchase page would stay monochrome; price-rank is the signal
the backend actually exposes (via `priceMinor`). _Considered:_ let the backend
return a theme/accent per tier. Rejected — backend exposes no theme field and
is frozen (ADR-0002); presentation is a frontend concern.

Kept non-goals: rank accents are **not** a "deal" claim and never change price,
availability, or behavior; a single-tier event stays standard blue (no false
"deal").

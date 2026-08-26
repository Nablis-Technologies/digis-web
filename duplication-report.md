# Duplication baseline report

**Overall duplication:** 5.69% by lines (2,422 of 42,579) and 6.64% by tokens (28,039 of 422,446).

This baseline was generated on 2026-08-26 with `jscpd` using `--min-lines 5 --min-tokens 50` across `src/features` and `src/components`.

## Top 10 file pairs by matched lines

| Rank | Matched lines | File pair |
|---:|---:|---|
| 1 | 444 | `src/features/event-detail/components/LineupSection.tsx` ↔ `src/features/event-detail/components/OrganizerSection.tsx` |
| 2 | 337 | `src/features/event-detail/components/OrganizerSection.tsx` ↔ `src/features/event-detail/components/VenueMap.tsx` |
| 3 | 169 | `src/features/event-detail/components/LineupSection.tsx` ↔ `src/features/event-detail/components/VenueMap.tsx` |
| 4 | 142 | `src/features/event-detail/components/OrganizerSection.tsx` ↔ `src/features/event-detail/components/OrganizerSection.tsx` |
| 5 | 126 | `src/features/checkout/components/DetailsStep.tsx` ↔ `src/features/checkout/components/PaymentStep.tsx` |
| 6 | 114 | `src/features/discovery/components/FeaturedCarousel.tsx` ↔ `src/features/discovery/components/PosterCarousel.tsx` |
| 7 | 100 | `src/components/EventCard.tsx` ↔ `src/features/discovery/components/CountdownBadge.tsx` |
| 8 | 95 | `src/components/ui/context-menu.tsx` ↔ `src/components/ui/dropdown-menu.tsx` |
| 9 | 84 | `src/components/ui/dropdown-menu.tsx` ↔ `src/components/ui/menubar.tsx` |
| 10 | 66 | `src/features/profile/components/SettingsAccountCard.tsx` ↔ `src/features/profile/components/SettingsAccountCard.tsx` |

## Raw measurement

- Clone groups: 112
- Sources scanned: 268
- Total lines scanned: 42,579
- Total tokens scanned: 422,446

Notes: self-pairs are retained where jscpd detected repeated regions inside a single file. Generated UI primitives under `src/components/ui` are included because the requested scan covered all of `src/components`.

## Execution note

`npx` is not installed in this environment. The requested command was executed equivalently with `pnpm dlx jscpd@3.5.10` after the latest jscpd binary proved incompatible with the environment's GLIBC version.

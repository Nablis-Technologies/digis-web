# Achievement detail sheet + radial glow (export) — not ported

- **Status:** blocked on backend contract — `docs/BACKEND_GAPS.md` **#73** (2026-10-24).
- **Found:** 2026-10-15, during the artwork-environment port
  (`docs/handoffs/web2-ui-import.md` → "Design-element audit").

## Context

The export's `ProfilePage` (`features/profile/pages/ProfilePage.tsx:508-588`) makes
each achievement a **button** that opens an `AchievementSheet` bottom sheet: a
radial colour glow orb
(`radial-gradient(ellipse at 50% 0%, ${ach.color}, transparent …)`), an animated
progress bar, and a perks list.

The app (`src/features/profile/pages/ProfilePage.tsx:250-285`) renders achievements
as static, non-interactive rows — no sheet, no glow.

## Why it is blocked (not just un-ported)

The sheet's content (progress bar, perk list, "earned on" copy) is not derivable
from any surface we have. Achievements are a **consumer surface with no backend**
— see `docs/BACKEND_GAPS.md` #46–#51 for the same pattern. Building the sheet now
means inventing its fields (ADR-0002), which is exactly what the export does.

## Suggested steps

1. Decide the product shape: is there an achievements/quest surface, and what does
   the backend expose per achievement (progress, target, perks, earned date)?
2. If yes → file the endpoint as a backend gap, then port the sheet behind the
   served fields (inert until the payload carries them).
3. If no → close this as `wontfix` and keep the static rows; the radial glow alone
   is not worth porting (the app has one glow vocabulary — `ImmersiveBackdrop` +
   the artwork environment — and a third ad-hoc glow would be a token to maintain).

## Ownership correction 2026-10-24

The user confirmed that backend behavior and API decisions belong to the backend
developer. Missing achievement support is filed as #73. The suggested steps
above are historical; do not ask the frontend user to choose earning rules or
implement a speculative contract. No attendance/purchase thresholds, XP, tiers
or rewards have been approved. Resume frontend wiring after the backend
developer supplies the committed contract.

## Frontend cleanup 2026-10-24

The hardcoded static achievement rows and other fabricated profile gamification
widgets have been removed. Earlier references to retaining those rows describe
the historical export. The detail sheet remains blocked by backend gap #73; no
achievement rules or payloads were invented.

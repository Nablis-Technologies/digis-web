# Data integrity audit — seeds + e2e vs current backend (2026-10-02)

Read-only audit of the dev seed chain and the e2e/mock data against the current
backend (`feat/launch-hardening-telemetry` @ `f679e56`, after the Composable
Admission Selection release + seller payouts).

Dev seed chain: `db/seeds.rb` → always `db/seeds/base.rb`; `DIGIS_SEED_PROFILE=dev`
→ `db/seeds/preview.rb` + `db/seeds/dev_extensions.rb` → `db/seeds_events.rb`
(the frontend-owned mock-mirror) → `db/pazimo_seed.rb` + `db/pazimo/events_raw.json`.

**Structural fragility (read this first):** all per-event behavior is keyed to the
**pazimo array index** — `PAST_EVENT_INDICES`, `EVENT_TYPES`, `BOOKABLE_RSVP_INDICES`,
`FORCE_SOLD_OUT_INDICES`, `AUDIENCE_OVERRIDES`, `TICKET_TYPE_CONFIGS`
(`pazimo_seed.rb:40,175-231`) — and slugs are derived with `-2`/`-3` dedupe
suffixes. A re-scrape that reorders/adds listings silently repoints every
index-keyed slug, tier, audience, and both e2e and the frontend.

## A. Backend seed drift (dev setup — `chore(dev)`)

| Finding | Evidence | Impact |
|---|---|---|
| No seller payout account and no seller ledger balance seeded | no `Marketplace::SellerPayoutAccount`/`SellerLedgerEntry` writes in any seed; constraints `seller_payout_account.rb:28-37`, `seller_ledger_entry.rb:32-49` | **`/payouts` is empty out of the box**; `GET /marketplace/seller/balance` → `[]`, `POST …/payouts` → `seller_payout_account_required`. The new feature is undemonstrable from a clean seed. |
| Dead `event_setting.config` vocabulary still written (`event_type`, `rsvp_*`, `access_mode`, `seat_map`, `lineup`, `access_codes`, …) | `seeds_events.rb:610-638`; public serializer slices to `%w[public_guest_limit]` | Misleading; the real gates are `ticket_type.audience`/`approval_mode`/`waitlist_enabled`. Some events are "rsvp" in dead config yet sell a public offer. |
| Gated offers seeded with no `AccessCode`/`Invitation` rows | `pazimo_seed.rb:194-195,224` (audience set); no credential rows (only dead config `access_codes`) | Gated (`code_or_invitation`/`invitation`) selection can't be exercised end-to-end. |
| `metadata.requires_ticket` never set; `public_guest_limit` never seeded | product serializer reads it (`catalog/public/event_product_serializer.rb:27-29`) | The `requires_ticket` gate is never exercised; public config always `{}`. |
| `chapa-test-event` mixes a ticket + a non-ticket product (`type: "other"`) | tickets `preview.rb:988-1122`; non-ticket `preview.rb:957-981` | A mixed cart hits `product_unavailable` (`admission_selections/create.rb:196-197` = #63); the `"other"` product also can't fulfill (not in `add_ons/validate_product.rb:9`). |
| `seeds_events.rb` **deletes** preview fixtures (`addis-music-fest-2026`, cancellation drills) | created `preview.rb:253-259,1259-1530`; deleted `seeds_events.rb:511-534` | Dev profile loses them after the mock-mirror runs. |
| `IN ()` SQL error when `admin_event_ids` is empty | `seeds_events.rb:536-541` (unguarded interpolation; compare `in_list` at `:314-318`) | Standalone `bin/rails runner db/seeds_events.rb` crashes right after `base.rb`. |
| Destructive + nondeterministic | purge `seeds_events.rb:307-421`; `rand`/`sample` `pazimo_seed.rb:57-66,139-162` | Every reseed wipes orders/tickets/registrations and churns product IDs / dates. |

## B. E2E data drift (frontend)

| Spec | Issue | Risk |
|---|---|---|
| `zz-live-payment.spec.ts:8-9` | buys `avenida-desperados-pregame-edition` + tier `Final Wave`; that slug is idx0 (**past**), and `Final Wave` is on the deduped `…-2` (idx25) | **High — wrong slug + tier + ended event** |
| `zz-deathnote.spec.ts:31` | asserts tier `Convention Pass`; `death-note-anime-convention` (idx20) only has `Regular@350` (and is sold out) | **High — tier doesn't exist** |
| `routing.spec.ts:4-5,73-74` | expects `+251900123456` to own a wallet ticket; the seed owns none for that user (only `+251911000003` on the preview event) | **High — needs a manual purchase drill** |
| `checkout.spec.ts:111-118` | "holds fulfilled-but-still-active registrations" — false on a clean seed (registrations are purged) | Medium — comment/precondition stale |
| `state-gating.spec.ts`, `zz-live-audience-gate.spec.ts`, `zz-live-guest-otp.spec.ts` | depend on index-keyed slugs/audiences (`friends`/$0 `Free Entry`, `unity-in-beats` ended, `psy-addis-saltland` `code_or_invitation`, `origins-2` invitation) | Medium-High — repointed by any re-scrape |

Deterministic (wire-mocked, safe): `seller-payouts.spec.ts`, `payment-return.spec.ts`.
Live + seed-dependent: `auth`, `checkout`, `event-detail`, `routing`, `state-gating`,
`wallet-audit`, `mock-audit`, plus the `zz-*` drills.

## C. Frontend mock drift

| Finding | Evidence | Recommendation |
|---|---|---|
| `mock-audit.spec.ts` asserts nothing about provenance | `:19-38` only logs image counts | Add `expect(mockHostImgs).toHaveLength(0)`; cover wallet/resale |
| Mock-host image fallback leaks into live paths | `eventImages.ts:8-9` `getEventImage` used by `tickets.ts:550`, `resale.ts:101,151,177`, `transfer.ts:72` | Render absent on missing backend cover (ADR-0002) |
| Mock issuance pipeline still imported | `tickets.ts` `MOCK_USER_TICKETS` + `issueTicketsForOrder`; imported by router/payment-return/… | Delete + drop the `src/lib/mock/events.ts` import |
| Mock-quote fallback can fabricate a 5% quote for a real event missing tier ids | `order.ts:28,300-312,366-368`; synthetic `ticket:` ids `useCheckoutFlow.ts:257` | Gate behind an explicit dev flag; error otherwise |
| `UIPreviewPage` ships fake events/prices/organizers on a prod route | `router.tsx:873` | Gate behind a dev flag or remove from prod |
| Dead files | `src/lib/mock/tickets.ts`, `src/lib/mock/current-user.ts` | Delete |

## Practice (going forward)

**After any backend sync/change that alters the contract, sweep the data too:**
1. Does the change add a surface whose data must exist to be exercised (e.g. seller
   payout balance)? Add a seed fixture.
2. Does it remove/rename fields the seeds still write? Clean the seeds.
3. Does it change slugs/tiers/accounts an e2e spec asserts? Update the spec.
4. Are e2e specs depending on manual drill state? Make them self-seeding or seed it.

Recorded in `AGENTS.md` → "Data integrity (seeds + e2e)".

## Fix plan (prioritized)

**P0 — DONE 2026-10-02**
1. ✅ Seller payout seed — `db/seeds/dev_demo.rb` (a verified `test` destination +
   a 500000 ETB `adjustment` balance for `+251900123456`), loaded last via
   `db/seeds/dev_extensions.rb`. Backend `chore(dev)` commit.
2. ✅ `zz-live-payment` → `avenida-desperados-pregame-edition-2` + `Final Wave`;
   `zz-deathnote` tier → `Regular` (frontend commit).
3. ✅ `routing.spec` now deep-links the seeded `attendee` (`+251911000003`, who
   owns a ticket) instead of the buyer who owns none after a clean reseed.

Verified: full `DIGIS_SEED_PROFILE=dev` reseed → seller balance 500000 + verified
destination, attendee 1 ticket, buyer 0; Playwright suite **28/28**.

**P1 — DONE 2026-10-02**
4. ✅ Guarded the `seeds_events.rb` `IN ()` path (nil-uuid fallback when the
   admin-event set is empty, so a standalone run doesn't crash). `TEST_EVENT_SLUGS`
   left as-is — removing those preview-only events from dev is intentional (they'd
   pollute discovery) and no frontend spec depends on them.
5. ✅ Removed the dead admission/RSVP `event_setting.config` keys (kept the
   non-admission data — `featured`/`rating`/`seat_map`/`lineup`/`age_restriction` —
   that #53/#36 will re-expose). Seeded gated credentials in `dev_demo.rb`
   (`DRILL-CODE` on psy-addis-saltland; `origins-invite-0001` on origins-2) — both
   authorize live. `public_guest_limit` not seeded (no consumer yet).
6. ✅ `Chapa Test Product` type `other` → `merchandise` + `metadata.requires_ticket`
   (now a fulfillable add-on, no longer rejected as an unusable product); an
   idempotent correction fixes existing dev DBs. (#63 — the public selection still
   rejects ticket+add-on carts — remains open.)

Verified: clean dev reseed; both credentials authorize (`authorized: true`);
Playwright **28/28** (one transient parallel-login flake, green on re-run).

**P2 — DONE 2026-10-02** (commit `7e5b209`)
7. ✅ `mock-audit.spec.ts` now asserts `mock-host images === 0` (discovery + detail).
   Removed the mock-host image fallback (`eventImages.ts`) from wallet/resale/
   transfer/guest-wallet — a missing cover now renders absent (ADR-0002). Deleted
   the mock issuance pipeline (`MOCK_USER_TICKETS`/`issueTicketsForOrder`/
   `resetToSeed`/`addReceivedTicket`/`updateTicketAnswers`) + `mock/tickets.ts` +
   `mock/current-user.ts` + the unreachable `EditTicketAnswersDialog`. Closed the
   `order.ts` mock-quote fallback for real events. `/ui-preview` is now registered
   in dev only. (Also fixed two stale e2e name selectors — placeholder is
   `Abebe`, not `Abebe Bekele`.)

Verified: tsc · vitest **145/145** · build · Playwright **28/28**; no
`mock/events`/`eventImages` references remain in `src`.

**Follow-ups done 2026-10-02:**
- **De-flake:** seller-payout specs now log in as a dedicated account
  `+251911000007` (seeded in `dev_demo.rb` with a verified destination + balance),
  not the shared buyer — no more parallel-login race with `checkout.spec`.
- **Live drill:** `e2e/zz-live-seller-payout.spec.ts` (run `RUN_ZZ=1`) drives the
  real `/payouts` UI → real `pending` payout + balance drop.

## Seed-side fixes (2026-10-15) — two deficiencies that sat *inside* gap entries

Both were seed problems that had been written up as (or alongside) backend gaps.
Fixed in the seed — backend `chore(dev)` commit `ec36172d` — and removed from
the gap list. **A seed omission is never a gap** (see the header of
`docs/BACKEND_GAPS.md` and the setup section of `docs/NOT_BACKEND_GAPS.md`); it
lives here.

**1. Venue geo + media were never seeded (was #36's "venue half").**
Public `GET /venues/:id` serves `latitude`/`longitude` and ActiveStorage
`profile`/`photos`, but no seed wrote any of them, so all 23 venues returned
blank coords, `profile_url: null`, `gallery_urls: []` — every map pin and venue
photo rendered absent. Fixed in `db/seeds_events.rb` (a backfill over all
venues): coordinates mirror the frontend's former `venueCoords.ts` stopgap for the
named venues, with a deterministic Addis-Ababa-area offset for the rest, plus a
profile and two gallery photos per venue.
Verified live: `GET /venues/:id` → real coords + media; 23/23 venues with geo +
profile + photos.
**Frontend follow-up:** switch `VenueMap`
(`src/features/event-detail/components/VenueMap.tsx`) off the name→coords
stopgap (`src/lib/utils/venueCoords.ts`) onto `GET /venues/:id`, and render the
photos.

**2. Dead admission vocabulary still computed in `pazimo_seed.rb#attrs` (cited by
#44).** It computed `event_type`, `rsvp_*`, `access_mode`, `invite_*`,
`allows_plus_one`, `max_guests`, but `seeds_events.rb` only ever wrote a
non-admission whitelist, so none of them reached the DB. Removed (keeping the
bookable-RSVP `tickets_left` and the product list, which do read `etype`).
Verified: the only distinct `event_setting.config` keys left are
`featured / rating / tickets_left / sold_out / seat_map / age_restriction /
lineup / organizers / answer_edit_window_hours / price_foreign_from_minor /
foreign_currency` (+ `public_guest_limit` on 2 events). No dead admission key
remains anywhere.

## Seed task DONE (2026-10-15) — genuinely multi-day + recurring fixtures

`e2e/festival.spec.ts` and `e2e/recurring.spec.ts` were **route-mocked** because
the dev seed had neither shape:

- `resolveFestivalSchedule` (`src/lib/festival.ts`) needs **one** event with more
  than one `EventDate`; every seed event had exactly one (multi-day was modelled
  as separate "Day 2" events, e.g. `unity-in-beats-day-2`).
- The recurring UI needs a `RecurrenceRule`; the engine exists (it is fully
  modelled — see #68) but no event carried a rule in dev. `addis-music-fest-2026`
  *did* carry a rule, but it is in `TEST_EVENT_SLUGS` and the mock-mirror deletes
  it (deliberately — it polluted discovery).

Both now exist in `db/seeds/dev_demo.rb` — loaded last, so the mock-mirror does not
purge them (the slugs are exempted from its stale sweep via `DEV_FIXTURE_SLUGS` in
`db/seeds_events.rb`). They are destroyed and rebuilt on each run, like the events
the mock-mirror owns, so a partial fixture self-heals.

| Fixture | Shape | Live today |
|---|---|---|
| `addis-sound-festival-2026` | 3 consecutive nights, a per-day bill (`event_date_id`), a `Full Festival Pass` (3 admissions, allocated across all three dates) + one single-night ticket per date | ✅ day bar, all-days pass vs per-night tiers, per-day ticket scoping all render |
| `thursday-jazz-sessions` | `FREQ=WEEKLY;BYDAY=TH` rule materialised to 7 Thursday sessions (bounded by `generated_until`), a guest pinned per session, one `choose_one` GA offer allocated across the run | ⏳ dates + rule exist; the surface stays inert until #68 gives the payload a series signal — it currently renders as a multi-day event (the documented fallback) |

Dates are relative to the run (the mock-mirror's convention) so the fixture never
rots into a past event. `e2e/festival-live.spec.ts` pins the live festival; the
per-day roster stays absent while `event_participants` is not public (#36), pinned
as a contract guard.

**Two seed landmines found while building this** (both fixed in `seeds_events.rb`):

1. `catalog_product_date_allocations` carries a **deferred constraint trigger**
   (`trg_date_allocation_sum_check`, `DEFERRABLE INITIALLY DEFERRED`): a product's
   allocations must cover every granted date and sum to exactly 10,000 **at
   commit**. Inserting one date at a time commits each alone (sum 3,334) and the
   commit is rejected — a multi-date product's rows must land in one transaction.
   `seed_ticket_product!` now wraps them.
2. `seed_ticket_product!` hardcoded `admissions_per_unit: 1`, a `fixed` date
   selection and a single covered date, so it could not express a pass or a series
   offer. It now takes `covered_dates` / `admissions_per_unit` / `date_selection`
   (single-date callers unchanged), and the inline event deletion the mirror used
   is extracted as `destroy_event!` for reuse.


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

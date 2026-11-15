# Backend gap audit — 2026-10-24

Status: source audit complete; live API/provider verification unavailable.

## Baseline

Fetched `origin` successfully on 2026-10-24. The tracked remote branch
`origin/feat/launch-hardening-telemetry` remains `8419aaaf2ef1e7a6fb7f0146d7a995948ea2fafe`.
Local backend HEAD is `55f535dd2b3074bf4f52711c576f92e050b8aefc`, ahead 10 / behind 0.
`git diff --name-only origin/feat/launch-hardening-telemetry HEAD -- app config/routes.rb db/structure.sql`
is empty. Local additions concern dev setup; staged/unstaged/untracked setup
changes were preserved. No merge was needed. No backend files were edited.

Docker Desktop was launched in the background, but its Linux engine pipe remained
unavailable and HTTP `127.0.0.1:3000/up` refused the connection. No new live API,
provider-payment, payout, database or seed verification is claimed. No reseed,
payout or external money movement was attempted.

## Every entry open at the start of this audit

Backend paths below are relative to `digis_backend`; frontend paths are relative
to `digis-web`. Findings refer to committed implementation, not a future plan.

| Gap | Result | Current evidence | Frontend obligation |
|---|---|---|---|
| #53 seat_map | Still absent; age-restriction half remains resolved | `app/serializers/events/public/event_detail_serializer.rb:8-11`; no seating contract/model in app/routes/schema. `event_detail_setting_serializer.rb:8-11` serves age restriction only | Continue omitting seat step when absent. Existing `events-adapter.ts` maps age restrictions; no new seating surface to wire |
| #57 password reset | Still absent | `config/routes.rb:5-15`; `app/controllers/core/auth_controller.rb:91-110` reauthenticates with the existing password, not recovery | No new endpoint; do not substitute signup/guest claiming |
| #65 seller payout | Reclassified as provider-recipient/settlement verification; no confirmed request-shape bug | `docs/operations/frontend-backend-gap-tracker-2026-09-08.md`, G-03, reports synthetic recipient rejected with `Invalid account number for the selected bank`; `app/services/finance/payout_providers/chapa_payout_client.rb:21-38` uses the documented nested account payload. No successful provider settlement is proven | Existing `lib/seller-payouts.ts` supports pending/processing/succeeded/failed; do not treat creation as payment. No API change to consume. Sandbox beneficiary and settlement verification belong in NOT_BACKEND_GAPS, not a speculative payload fix |
| #73 achievements | Still absent; requested backend contract dependency | No implementation/routes/schema/tests found; frontend fabrication removed 2026-10-24 | Await backend-owned rules/contract; no client achievement engine |
| #44 config | Narrowed: obsolete event-level admission ask is superseded; public_guest_limit remains inert | `app/serializers/events/public/event_setting_serializer.rb:8`; public_guest_limit has no application reader/enforcement. `events_controller.rb:147-170` and `events/create.rb:25-27` now support age config writes, contradicting the old blanket no-config-write claim | Offer-driven admissions already consumed; do not revive dead RSVP/access-mode keys. No new public_guest_limit behavior to invent |
| #46 saved/feed/reviews | Still absent; feed route points at missing Core controller | `config/routes.rb:529`; no `app/controllers/core/feed_controller.rb`. Existing `Core::Review` is status/context workflow, not consumer star ratings. Follows exist at routes 81-85,528 | Existing venue follows are wired. No new save/feed/review contract |
| #48 prefs/2FA/password change | Still absent, excluding implemented notification preferences | `app/controllers/core/users_controller.rb:64-66`; `Core::CurrentUserSerializer`; no 2FA/password-change routes. Notification preferences have their own controller/routes | Track remaining local-only Settings controls separately; issue 01 below. Do not represent a local toggle as real 2FA |
| #67 single-name profile | Still requires last_name | `app/models/core/user_profile.rb:16`, `db/structure.sql:4745`; signup integration name-validation tests | Retain `nameSplit.ts` fallback; no contract change to consume |
| #71 provider fees | Conversion defect still present | `app/services/payments/providers/chapa_client.rb:230,324-328` multiplies service_fee/charge by 100; prior verified minor-unit evidence unchanged. Finance ledger/reconciliation consume stored result | No frontend fee calculation/change; backend developer owns correction |
| #72 detail lifecycle | Omission remains; impact text corrected for existing mitigation | Detail serializer omits lifecycle/availability; list serves them. `events/public/dates_query.rb:24-26` previews dates with ends_at > at, not starts_at >= now | `EventDetailPage.tsx:100-138` already probes schedule on an empty preview and derives ended state. Adapter supports eventual fields. No new server projection to wire |

## Resolved/partial wiring sweep

There were no new backend app/routes/schema changes and no newly resolved or
newly partial API surfaces. Existing partial #53 is still age-restriction wired /
seat-map unavailable. Checked previously owed consumers: `payment-return.ts`
reconciles payment refresh (#18); TopBar + `transfer.acceptAuthenticated` consume
incoming transfer actions (#61); `events-adapter.ts` maps roster, age restrictions,
recurrence and date previews (#36/#53/#68/#70); `products.ts` maps covered dates
(#69); `tickets.ts` maps registration-answer context (#50). Discovery filters
remain wired through `discoveryQuery.ts` and `eventsModule.fetchAll` (#49).

No frontend integration code was changed for this audit: there is no newly fixed
contract to consume. A Settings honesty follow-up is tracked in
`issues/01-settings-unbacked-controls.md`; it is frontend work, not a new backend gap.

Remaining backend worklist: blocking #53 seat_map / #57 / #73; degrading
#44 narrowed / #46 / #48 / #67 / #71 / #72. Payout settlement remains unverified
under NOT_BACKEND_GAPS #65 and must not be described as a successful payout fix.

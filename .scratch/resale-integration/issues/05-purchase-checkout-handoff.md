# 05 — Purchase hands off to checkout, honest pending state

Status: implemented — verified unit/typecheck/build (live drill in 08)

Blocked by: 02

## Scope

Wire buying to `POST /resale_listings/:resale_listing_id/purchase` and pass
the returned pending-payment order straight into the checkout module's
existing payment starter and return-confirmation path (redirect, return
verification, wallet polling). Hide buy on own listings. After payment
submission show processing (with expiry awareness) until the wallet proves
fulfillment — never claim ownership earlier. Delete the mock order builder.

## Acceptance

- Buy → pay → ticket appears in wallet, reusing checkout's flow verbatim.
- Pre-payment the UI never says "purchased"; post-payment it says
  "processing" until the wallet confirms.
- No new polling mechanism; no order-status endpoint assumed.

## Comments

- `purchaseListing` is live: `POST resale_listings/:id/purchase`
  (`{purchase: {}}` — answers/consents optional) → pending-payment order
  passthrough. Registration-gated ticket types fail here as typed errors
  (copy in 07); structured answers/consents are a follow-up, not this
  ticket.
- Sheet mirrors the checkout hook verbatim: startPayment → processing +
  `checkout_url` ⇒ persist `digis:payment-url:<orderId>` and redirect to
  Chapa; the existing return-verify + wallet-poll path is the completion
  signal. The premature in-sheet "Purchased" claim is gone — success shows
  only for the already-accepted edge; failures render inline error text.
- Payment method stays hardcoded telebirr/chapa (method picker is a
  follow-up, not a contract issue).
- Mock store deleted — no mock state remains in the module.
- Verified: resale suite 15/15, full vitest 27/27, `tsc` clean, `vite
  build` ok.

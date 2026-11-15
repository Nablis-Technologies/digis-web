# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Ethiopian event-goers on phones. They discover events, buy tickets, hold them in a ticket wallet, and resell or transfer them.

This frontend serves consumers only. Organizers and admins are served elsewhere; no organizer, admin, or analytics surface belongs here.

## Product Purpose

Consumer event-ticketing frontend for the Digis platform (Ethiopia market). It exists so a buyer can go from discovering an event to holding a valid ticket on their phone — and later pass that ticket on — without paper, box offices, or informal screenshot tickets. Success means a buyer completes purchase and gains entry, and can resell or transfer when plans change.

## Positioning

The full ticket lifecycle in one place: buy, hold (wallet), resell, transfer — not just entry. A neighboring product that only sells admission could not truthfully copy the wallet-to-resale-to-transfer loop.

## Operating Context

- Phone-first mobile web; Vite single-page app (`pnpm dev` on :5173).
- Money is integer cents in ETB end-to-end; the Rails backend (`http://localhost:3000`) computes all amounts. The frontend never prices, never issues tickets.
- Purchase pipeline: consent → registration → order quote → order → payment attempt (Chapa hosted checkout: Telebirr, card) → webhook → async ticket issuance.
- Buyer identity is phone-based; some flows require a verified identity (`verified_at`).
- ETB market realities: mobile-money payment methods, Chapa redirect-and-return checkout, low-bandwidth tolerance.
- Domain language follows `CONTEXT.md` (Event, EventDate, TicketType, EventProduct, Order, OrderQuote, PaymentAttempt, ResaleListing, TicketTransfer, CredentialClaim, PromoCode, Organizer, Category).

## Capabilities and Constraints

Confirmed capabilities: event discovery grid, event detail by slug, phone+password auth, guided checkout (details → tickets/extras → review → payment), ticket wallet with QR entry, resale marketplace (list / browse / buy), ticket transfers and gift/claim links (`/claim/:token`), display-only profile/settings.

Constraints: the backend is the source of truth for behavior, money, fees, and order of operations; the frontend mirrors its contract and does not invent its own. Resale is permitted only at or below face value plus applicable fees (see Settings legal copy).

Explicitly undecided: guest checkout for new/unverified buyers, CBE as a payment method, buyer-scoped order confirmation after Chapa return.

## Brand Commitments

- Name: **Digis**, rendered as a "Digis" wordmark.
- Brand mark: the inline `DigisMark` SVG component (`src/features/tickets/components/ShareCardParts.tsx`, mirrored in `AuthModal.tsx`) — there is no committed logo image file. (The user believes a logo file exists; its location is unconfirmed — confirm before treating any image file as canonical.)
- Brand lime `#d6f905` on dark surfaces (near-black `#0a0a0a` mark on light).
- Payment provider logos in `src/assets/provider-logos/` (Telebirr, CBE, bank).
- Voice: short, confident, scannable. Established phrases: "Verified by Digis", "Digis Buyer Guarantee", "Welcome to Digis".

## Evidence on Hand

- Live Rails backend with a 28-event seed mirror; Playwright e2e suite proving login → consent → registration → quote → order → Chapa hosted checkout, plus a wallet audit spec.
- No testimonials, customer lists, benchmarks, pricing claims, or press assets exist. Future work must not fabricate any.

## Product Principles

1. The backend decides; the frontend displays. Never compute money or issue tickets client-side.
2. Phone-first and forgiving: every flow must survive small screens, slow networks, and payment redirects.
3. Lifecycle, not entry: design for resell, transfer, and re-entry, not just the first purchase.
4. Trust at the gate: verification, guarantees, and QR proof beat decoration.
5. One audience: every surface serves the ticket buyer; organizer tooling lives elsewhere.

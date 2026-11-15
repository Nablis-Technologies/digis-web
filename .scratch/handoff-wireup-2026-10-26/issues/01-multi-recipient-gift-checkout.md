# Multi-recipient gift checkout

Status: blocked — backend gap #74 (verified 2026-10-26)

Remaining from Gifting flow.md. Current checkout correctly forces one ticket for
one recipient per purchase. It does not yet offer multiple distinct gift line
items in one order. Add recipient rows with independent phone/email/note inputs,
each with quantity 1, and submit the existing admission-selection items array.
Read backend selection normalization/quote semantics before implementation;
all totals and validation must remain backend-computed. Do not multiply a
frontend total or invent a new batch endpoint. Preserve one-recipient checkout.

Verify separate recipients remain distinct in the wire payload, required fields
and self-gift validation attach to the relevant row, and server order totals and
all gift delivery rows render. This issue remains open; the gifting handoff must
not be described as fully complete until it is handled.

## Contract check 2026-10-26

The previous ready status assumed the items array supported repeated products.
Committed backend HEAD 55f535dd rejects these in selection, guest OTP and quote;
gift/registration intents are product-keyed. See docs/BACKEND_GAPS.md #74.
Do not add recipient rows that the API cannot submit or change backend code.
Resume when the backend engineer supplies the supported line contract.

# Digis (frontend context)

Consumer frontend for a phone-first event-ticketing platform serving the Ethiopia market. Users discover events, buy tickets, receive them into a wallet, and can resell or transfer them.

## Language

**Event**:
A published gathering (ticketed, RSVP, or invite-only) with dates, a venue, products, and an organizer.
_Avoid_: show, gig, listing

**EventDate**:
A single scheduled occurrence of an Event (start/end time, doors, venue). An Event has one or more.
_Avoid_: showtime, session, "the event's date" (when you mean the time slot)

**RecurringSeries**:
An Event whose dates come from a recurrence rule (a weekly resident night, a monthly series). Its EventDates are the series' *sessions*. Not a separate domain entity — the type stays `EventDate`; "session"/"showtime" survive only as the user-facing UI vocabulary of the ported recurring components (`SessionCarousel`, `ShowtimePicker`), matching the design labels. Gated on the backend series signal (`BACKEND_GAPS.md` #68).
_Avoid_: calling a single-day or festival EventDate a "session" — it means a recurring occurrence specifically.

**Venue**:
The physical location where an EventDate happens. Has a name and a city.
_Avoid_: place, location, hall

**TicketType**:
A purchasable tier of admission to an Event (e.g. VIP, Early Bird), with a price, availability, and optional seat/early-bird/couples behavior.
_Avoid_: tier (fine in the UI, but keep "ticket type" in code), pass

**EventProduct**:
Any purchasable item for an Event: a ticket, parking, merchandise, food, donation, or digital add-on.
_Avoid_: extra, add-on (use for a specific sub-type only)

**SeatMap**:
The assigned-seating layout of an Event: sections of rows of seats, some sold. Used only by seat-map Events.
_Avoid_: seating chart, floor plan

**Order**:
A completed purchase for one or more EventProducts, at a fixed total in a single currency.
_Avoid_: checkout, purchase, transaction, booking

**OrderQuote**:
A server-computed price breakdown for a prospective Order (subtotal, discounts, fees, total) that expires. Created before an Order.
_Avoid_: price estimate, cart total

**PaymentAttempt**:
One attempt to pay for an Order through a provider (Telebirr, CBE, card). An Order can have several.
_Avoid_: payment, charge, transaction

**ResaleListing**:
A ticket its owner offers for resale at an asking price, capped by platform policy. Buyable by other users.
_Avoid_: resale ticket, second-hand listing

**TicketTransfer**:
Moving a ticket from one user to another, accepted by the recipient.
_Avoid_: transfer (verb — say "transfer the ticket"), forwarding

**CredentialClaim**:
A link-based handoff of a ticket to someone who may not have an account yet, redeemed with a one-time token.
_Avoid_: transfer link (it is a transfer, but claims are the unregistered-recipient variant)

**PromoCode**:
A discount code a buyer applies to an Order (percent or fixed), validated by the backend at quote time.
_Avoid_: promo, voucher, coupon (fine in the UI; keep "promo code" in code)

**PayoutMethod**:
A seller's registered destination (Telebirr / CBE / bank account) for proceeds from resale.
_Avoid_: payout account, bank account, wallet

**Organizer**:
The organization that runs an Event. The frontend shows the organizer's name on Event detail.
_Avoid_: promoter, host, company (unless the backend calls it that)

**Category**:
The classification label of an Event (Music, Culture, Sports, etc.).
_Avoid_: genre, tag

**Gradient**:
The Tailwind gradient overlay classes used purely for Event artwork presentation. UI-only; never sent to or read from the backend.
_Avoid_: (none — presentation concept, name as-is)

## Relationships

- An **Event** has many **EventDate**s, **EventProduct**s, a **SeatMap** (optional), a **Category**, and an **Organizer**
- A **TicketType** is an **EventProduct** (the ticket sub-type)
- An **Order** is created from an **OrderQuote**, and is paid by one or more **PaymentAttempt**s
- A **Ticket** (result of an **Order**) can be listed as a **ResaleListing**, transferred via a **TicketTransfer**, or handed off via a **CredentialClaim**

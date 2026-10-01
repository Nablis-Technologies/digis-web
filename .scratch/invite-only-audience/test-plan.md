# Test plan — audience gating (access code vs invitation)

- **Status (2026-10-01):** access-code AND invitation UI cases PASS after ticket 01
  (invitation via `?invitation=<token>` auto-unlock; a pasted value is tried as a
  code then a token). Mixed public+gated also handled. Remaining external
  dependency: the backend must email the invitation link so a buyer receives the
  token.
- **Backend evidence:** `Ticketing::Audience::Authorize` (`audience` ∈
  `public` / `access_code` / `invitation` / `code_or_invitation`);
  `POST /ticketing/audience_authorizations` accepts `access_code` or
  `invitation_token`; the proof is carried into `admission_selections`
  (`audience_proof`) and re-checked inside the waitlist submit.

## Test data (dev seed @ 2026-10-01)

Gated events in the dev DB (probed live):

| Event | Tier | `audience` | `approval` | product id | ticket_type id |
| --- | --- | --- | --- | --- | --- |
| `psy-addis-saltland` | Regular | `code_or_invitation` | automatic | `01a0f178-3de7-7b44-b913-e78f25dd90d0` | `01a0f178-3dea-76a9-bcb7-0c612163c09a` |
| `origins-2` | Regular | `invitation` | automatic | `01a0f179-1da0-7357-b3d0-5472855f67f4` | `01a0f179-1da3-7b1c-8f7e-588d15181c72` |
| `event` | Torpa ticket / VIP | `invitation` | — | — | — |

The dev **seed itself creates no access code or invitation** (the preview-only
`VIP-2026` / `vip-invite-0001` are absent — verified 422). Create them with the
organizer API. Route shape:
`POST /events/:event_id/event_products/:event_product_id/ticket_type/access_codes`
and `.../invitations` (organizer bearer token required).

```powershell
$tok = (Invoke-RestMethod -Uri http://localhost:3000/auth/login -Method Post -ContentType application/json `
  -Body (@{ identifier="+251911000002"; password="password123" } | ConvertTo-Json)).data.access_token
$h = @{ Authorization="Bearer $tok"; "Idempotency-Key"=[guid]::NewGuid().ToString() }

# Access code for the code_or_invitation tier (psy Regular)
Invoke-RestMethod -Uri "http://localhost:3000/events/01a0f178-3c56-700d-ab89-80bd715719ba/event_products/01a0f178-3de7-7b44-b913-e78f25dd90d0/ticket_type/access_codes" `
  -Method Post -Headers $h -ContentType application/json `
  -Body (@{ code="DRILL-CODE"; max_uses=50; max_quantity_per_use=5; active=$true } | ConvertTo-Json)

# Invitation for the invitation-only tier (origins-2 Regular) — response carries the token
Invoke-RestMethod -Uri "http://localhost:3000/events/01a0f179-1c81-7add-90c4-73e08bc147e3/event_products/01a0f179-1da0-7357-b3d0-5472855f67f4/ticket_type/invitations" `
  -Method Post -Headers $h -ContentType application/json `
  -Body (@{ email="og.drill@example.com"; allowed_quantity=1 } | ConvertTo-Json)
```

## API cases (all PASS now)

| # | Call | Expected |
| --- | --- | --- |
| A1 | `authorize { ticket_type_id: psy Regular, access_code: "DRILL-CODE" }` | 200 `authorized=true, reason=access_code` |
| A2 | `authorize { ticket_type_id: psy Regular, invitation_token: <psy token> }` | 200 `authorized=true, reason=invitation` |
| A3 | `authorize { ticket_type_id: origins-2 Regular, invitation_token: <og token> }` | 200 `authorized=true, reason=invitation` |
| A4 | `authorize { ticket_type_id: origins-2 Regular, access_code: "DRILL-CODE" }` | 422 (a code cannot open an invitation-only tier) |
| A5 | `authorize { ticket_type_id: psy Regular, access_code: "WRONG" }` | 422 |

## UI flows

### Access code — should PASS now (`psy-addis-saltland`)
1. Open `/events/psy-addis-saltland`.
2. Gate shows **"This event requires access"**; type `DRILL-CODE` → **Unlock**.
3. The ticket selector reveals; select **Regular** → **Buy Now**.
4. Walk checkout → Pay. Assertion: no `no_valid_code_or_invitation`; the order/
   approval outcome appears normally. The submitted selection carries
   `items[0].audience_proof.access_code = "DRILL-CODE"`.

### Invitation — PASSES now (`origins-2`)
1. Open `/events/origins-2?invitation=<token>` → the gate auto-tries the token and
   the ticket selector reveals (no typing).
2. Alternatively paste the token into the input → **Unlock** (tried as a code, then
   as a token) → the selector reveals.
3. Checkout carries `audience_proof.invitation_token`.

### `code_or_invitation` (`psy-addis-saltland`)
- Paste `DRILL-CODE` → unlocks as an access code.
- Paste the invitation token → unlocks as an invitation.
- Wrong value → gate stays locked with "not valid".

## Free `$0` admission (RSVP successor) — PASSES (live drill)

`e2e/zz-live-guest-otp.spec.ts` (`RUN_ZZ=1`) on `friends` "Free Entry": Pay →
real `422 phone_verification_required` → inline OTP → real ticket issued.

## Notes / preconditions for other cases

- **Gated waitlist proof** (fixed 2026-10-01): needs a **sold-out**,
  `waitlist_enabled` gated offer. None is seeded sold-out, so drive it by setting
  the product inventory to 0, then POST the waitlist join with and without the
  proof: without → audience error; with → `waitlisted`.
- **Mixed public + gated** (design, no seed case): the backend gates per ticket
  type; the UI currently hides the **whole** selector when any tier is gated, so a
  public tier becomes unreachable on a mixed event. Tracked in ticket 01.

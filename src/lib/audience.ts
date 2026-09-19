/**
 * Audience module — the deep module mirroring the backend's audience-gate
 * contract for invite-only / access-code events.
 *
 * Backend contract (verified live 2026-09-08, see BACKEND_GAPS.md #20):
 *   POST /ticketing/audience_authorizations   (public, no auth)
 *   body { ticket_type_id, access_code?, invitation_token? }
 *   200 → { authorized: true, reason: "access_code" | "invitation" | "public" }
 *   422 → error (code like no_valid_code_or_invitation, ticketing.*.invalid)
 *
 * The public config projection deliberately hides `access_codes` — the server
 * gate is the only real validation. This module calls it so the unlock is
 * backend-authoritative instead of client-side theater.
 */

import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/errors";

/* ─── Wire types ─── */

export type AudienceReason = "public" | "access_code" | "invitation";

export interface AudienceAuthorizationWire {
  authorized: boolean;
  reason: AudienceReason;
}

export interface AuthorizeAudienceInput {
  /** Backend Ticketing::TicketType id — the gate is per ticket type. */
  ticketTypeId: string;
  accessCode?: string;
  invitationToken?: string;
}

/* ─── The module ─── */

export const audienceModule = {
  /**
   * POST /ticketing/audience_authorizations (public, no auth). Validates an
   * access code / invitation against ONE ticket type's real gate (active,
   * in-window, not exhausted). Throws ApiError (422) on any invalid input.
   */
  async authorize(input: AuthorizeAudienceInput): Promise<AudienceAuthorizationWire> {
    const { data } = await apiFetch<AudienceAuthorizationWire>(
      "ticketing/audience_authorizations",
      {
        method: "POST",
        body: {
          ticket_type_id: input.ticketTypeId,
          ...(input.accessCode ? { access_code: input.accessCode } : {}),
          ...(input.invitationToken ? { invitation_token: input.invitationToken } : {}),
        },
      },
    );
    return data;
  },

  /**
   * Authorize one code/invitation against EVERY gated tier — valid for any of
   * them opens the gate (tiers may share one code or carry distinct ones).
   * Shared by GatedTierGate + InviteOnlySection.
   *
   * A 422 from the backend is a definitive "this code is not valid" (returns
   * false). Any other failure (network, 5xx) is re-thrown so callers show a
   * retryable "couldn't verify" message rather than blaming the user's code.
   */
  async authorizeAny(ticketTypeIds: string[], input: { accessCode?: string; invitationToken?: string }): Promise<boolean> {
    if (ticketTypeIds.length === 0) return false;
    const results = await Promise.all(
      ticketTypeIds.map((id) =>
        audienceModule
          .authorize({ ticketTypeId: id, ...input })
          .then((r) => r.authorized)
          .catch((e) => {
            if (e instanceof ApiError && e.status === 422) return false;
            throw e;
          }),
      ),
    );
    return results.some(Boolean);
  },
};
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
};
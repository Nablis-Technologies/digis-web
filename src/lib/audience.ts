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

/** The accepted audience proof to carry into checkout (`audience_proof`). */
export interface AudienceProof {
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
   * Shared by GatedTierGate (and the offer waitlist flow).
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

  /**
   * Resolve a single pasted value (access code OR invitation token) against
   * every gated tier: try it as an access code, then as an invitation token.
   * Returns the proof to carry into checkout, or null when neither authorizes.
   * The two are indistinguishable to the buyer and the backend takes them in
   * separate fields, so both must be attempted.
   */
  async resolveProof(ticketTypeIds: string[], raw: string): Promise<AudienceProof | null> {
    const value = raw.trim();
    if (!value || ticketTypeIds.length === 0) return null;
    if (await audienceModule.authorizeAny(ticketTypeIds, { accessCode: value })) {
      return { accessCode: value };
    }
    if (await audienceModule.authorizeAny(ticketTypeIds, { invitationToken: value })) {
      return { invitationToken: value };
    }
    return null;
  },

  /**
   * Authorize an invitation token that arrived from a link (the backend emails
   * the token in the event URL) against every gated tier.
   */
  async proveInvitation(ticketTypeIds: string[], token: string): Promise<AudienceProof | null> {
    const value = token.trim();
    if (!value || ticketTypeIds.length === 0) return null;
    return (await audienceModule.authorizeAny(ticketTypeIds, { invitationToken: value }))
      ? { invitationToken: value }
      : null;
  },
};
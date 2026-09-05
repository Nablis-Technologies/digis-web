/**
 * Registration module — the deep module mirroring the backend's registration +
 * consent contract for ticketed checkout (Phase 3).
 *
 * Backend flow (verified live 2026-09-04, see docs/BACKEND_GAPS.md #15):
 *   1. consentRequirements() → GET /public/events/:slug/ticket_types/:tt/consent_requirements
 *      (public, no auth; path takes the TICKET TYPE id — `ticket.ticket_type.id`
 *      from the products payload, not the product id)
 *   2. register() → POST /ticket_types/:ticket_type_id/registrations
 *      Header Idempotency-Key; body { phone, package_quantity, answers, consents }.
 *      Each consent needs { consent_document_version_id, request_uuid,
 *      acceptance_method, content_sha256, idempotency_key }. Phone must be the
 *      session user's phone (verified account — no guest path, gap #14).
 *   3. registration_id is then required by order_quotes for ticket lines —
 *      real money math only exists AFTER registration (Orders::BuildQuote
 *      rejects ticket items without one: registration_required).
 *
 * Idempotency: the backend fingerprints (ticket_type, identity, answers,
 * consents) into a request digest — replaying the same submit returns the same
 * registration instead of erroring; a DIFFERENT request for an identity that
 * already has an active registration → active_registration_conflict.
 */

import { apiFetch, randomUuid } from "@/lib/api";

/* ─── Wire types ─── */

export interface ConsentRequirementWire {
  consent_document_version_id: string;
  document_version: number;
  title: string;
  body: string;
  content_sha256: string;
  required: boolean;
  acceptance_scope: "buyer" | "admission_slot";
}

/** UI-facing consent document — one checkbox on the review step. */
export interface ConsentDocument {
  versionId: string;
  title: string;
  body: string;
  required: boolean;
  contentSha256: string;
}

export interface RegistrationOutcome {
  registrationId: string;
  status: string;
  /** "requires_order" | "requires_confirmation" | "awaiting_approval" */
  nextAction: string;
}

/* ─── Mappers ─── */

function mapConsent(wire: ConsentRequirementWire): ConsentDocument {
  return {
    versionId: wire.consent_document_version_id,
    title: wire.title,
    body: wire.body,
    required: wire.required,
    contentSha256: wire.content_sha256,
  };
}

/* ─── Module ─── */

export const registrationModule = {
  /**
   * GET /public/events/:event_slug/ticket_types/:ticket_type_id/consent_requirements.
   * Public endpoint. Empty list = nothing for the buyer to accept.
   */
  async fetchConsentRequirements(
    slug: string,
    ticketTypeId: string,
  ): Promise<ConsentDocument[]> {
    const { data } = await apiFetch<ConsentRequirementWire[]>(
      `public/events/${slug}/ticket_types/${ticketTypeId}/consent_requirements`,
    );
    return (data ?? []).map(mapConsent);
  },

  /**
   * POST /ticket_types/:ticket_type_id/registrations.
   * `phone` must be the logged-in user's verified phone. apiFetch injects the
   * Idempotency-Key header; each consent carries its own idempotency_key.
   * `answers` values come from the checkout questions step (keyed by question
   * key), formatted per question type. `accessCode`/`invitationToken` are the
   * audience proof for gated ticket types (top-level params on the backend).
   */
  async register(input: {
    ticketTypeId: string;
    phone: string;
    packageQuantity: number;
    answers: Array<{ questionKey: string; value: unknown }>;
    consents: ConsentDocument[];
    accessCode?: string;
    invitationToken?: string;
    /**
     * Stable per-checkout keys. The backend fingerprints (ticket_type,
     * identity, answers, consents) into a request digest AND keys on the
     * Idempotency-Key header: the same key + same content replays to the
     * SAME registration, while a fresh random key per retry with even
     * slightly different consent UUIDs → active_registration_conflict.
     * Callers must pass stable keys so a retried Pay click is idempotent.
     */
    idempotencyKey?: string;
    requestUuid?: string;
  }): Promise<RegistrationOutcome> {
    const requestUuid = input.requestUuid ?? randomUuid();
    const idempotencyKey = input.idempotencyKey ?? randomUuid();
    const body = {
      phone: input.phone,
      package_quantity: input.packageQuantity,
      ...(input.accessCode ? { access_code: input.accessCode } : {}),
      ...(input.invitationToken ? { invitation_token: input.invitationToken } : {}),
      answers: input.answers.map((a) => ({
        question_key: a.questionKey,
        value: a.value,
      })),
      consents: input.consents.map((c) => ({
        consent_document_version_id: c.versionId,
        request_uuid: requestUuid,
        acceptance_method: "otp",
        content_sha256: c.contentSha256,
        idempotency_key: `consent-${c.versionId}-${requestUuid}`,
      })),
    };
    const { data } = await apiFetch<{
      registration: { id: string; status: string };
      next_action: { type: string };
    }>(`ticket_types/${input.ticketTypeId}/registrations`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body,
    });
    return {
      registrationId: data.registration.id,
      status: data.registration.status,
      nextAction: data.next_action.type,
    };
  },
};

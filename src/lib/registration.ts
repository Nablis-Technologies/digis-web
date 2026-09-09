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

/** Published registration-form question (public schema, BACKEND_GAPS #19). */
export interface SchemaQuestion {
  id: string;
  key: string;
  type: string;
  response_scope: "registration" | "package_unit_number" | "admission_position";
  label: string;
  required: boolean;
  options?: unknown;
}

/** A published form version plus its questions. */
export interface RegistrationFormVersion {
  /** The form VERSION id — submit answers must carry it (form_version_id). */
  id: string;
  registration_form_id: string;
  form_name: string;
  version: number;
  questions: SchemaQuestion[];
}

/** Public schema for one ticket type: applicable published form versions. */
export interface RegistrationSchema {
  event_id: string;
  ticket_type_id: string;
  forms: RegistrationFormVersion[];
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
   * GET /public/events/:event_slug/ticket_types/:ticket_type_id/registration_schema
   * (BACKEND_GAPS #19 resolved 2026-09-08). Public, anonymous. Returns the
   * applicable published form versions so the buyer can submit answers with
   * the correct `form_version_id` (stale-version detection) and per-question
   * `response_scope`.
   */
  async fetchRegistrationSchema(slug: string, ticketTypeId: string): Promise<RegistrationSchema | null> {
    const { data } = await apiFetch<RegistrationSchema>(
      `public/events/${slug}/ticket_types/${ticketTypeId}/registration_schema`,
    );
    return data ?? null;
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
    /** Published form version id — the schema's applicable version (stale-version detection, #19). */
    formVersionId?: string;
    /** Required for ticket types with date_selection "choose_one" (the backend
     *  rejects registration without a selected event date — invalid_registration). */
    selectedEventDateId?: string;
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
      ...(input.selectedEventDateId ? { selected_event_date_id: input.selectedEventDateId } : {}),
      ...(input.accessCode ? { access_code: input.accessCode } : {}),
      ...(input.invitationToken ? { invitation_token: input.invitationToken } : {}),
      answers: input.answers.map((a) => ({
        ...(input.formVersionId ? { form_version_id: input.formVersionId } : {}),
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

  /**
   * POST /guest/ticket_types/:ticket_type_id/registrations (BACKEND_GAPS #14
   * resolved 2026-09-09). Phone-confirmed guest registration for unauthenticated
   * buyers. Same body shape as register() but requires phone_confirmation: true
   * and accepts optional full_name/email for the shadow user. No auth token
   * needed — the endpoint is public. The returned registration is bound to the
   * phone identity, not a verified user.
   */
  async guestRegister(input: {
    ticketTypeId: string;
    phone: string;
    fullName?: string;
    email?: string;
    packageQuantity: number;
    formVersionId?: string;
    /** Required for ticket types with date_selection "choose_one" (the backend
     *  rejects registration without a selected event date — invalid_registration). */
    selectedEventDateId?: string;
    answers: Array<{ questionKey: string; value: unknown }>;
    consents: ConsentDocument[];
    accessCode?: string;
    invitationToken?: string;
    idempotencyKey?: string;
    requestUuid?: string;
  }): Promise<RegistrationOutcome> {
    const requestUuid = input.requestUuid ?? randomUuid();
    const idempotencyKey = input.idempotencyKey ?? randomUuid();
    const body: Record<string, unknown> = {
      phone: input.phone,
      phone_confirmation: true,
      ...(input.fullName ? { full_name: input.fullName } : {}),
      ...(input.email ? { email: input.email } : {}),
      package_quantity: input.packageQuantity,
      ...(input.selectedEventDateId ? { selected_event_date_id: input.selectedEventDateId } : {}),
      ...(input.accessCode ? { access_code: input.accessCode } : {}),
      ...(input.invitationToken ? { invitation_token: input.invitationToken } : {}),
      answers: input.answers.map((a) => ({
        ...(input.formVersionId ? { form_version_id: input.formVersionId } : {}),
        question_key: a.questionKey,
        value: a.value,
      })),
      consents: input.consents.map((c) => ({
        consent_document_version_id: c.versionId,
        request_uuid: requestUuid,
        acceptance_method: "checkbox",
        content_sha256: c.contentSha256,
        idempotency_key: `consent-${c.versionId}-${requestUuid}`,
      })),
    };
    const { data } = await apiFetch<{
      registration: { id: string; status: string };
      next_action: { type: string };
    }>(`guest/ticket_types/${input.ticketTypeId}/registrations`, {
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

  /**
   * POST /registrations/:id/release (BACKEND_GAPS #22 resolved 2026-09-08).
   * Buyer-bounded: frees the identity+ticket-type slot for an own
   * `pending_payment`/`cancelled` registration so a fresh submit no longer
   * conflicts. Idempotency-Key required (apiFetch injects it).
   */
  async release(registrationId: string): Promise<void> {
    await apiFetch(`registrations/${registrationId}/release`, {
      method: "POST",
      headers: { "Idempotency-Key": randomUuid() },
      body: {},
    });
  },
};

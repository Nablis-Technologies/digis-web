/**
 * Registration module — the deep module for the backend surfaces the ticket
 * checkout still needs from Ticketing: the public consent + form schema reads,
 * the shared phone-OTP verify, and the guest ticket → account claim.
 *
 * Ticket registration itself is now created server-side by
 * `POST /public/events/:slug/admission_selections` (`lib/admission.ts`) — the
 * wholesale migration retired the frontend's direct `register`/`guestRegister`
 * calls (the backend assembles the registration(s) inside the selection).
 *
 * Endpoints kept here:
 *   - GET /public/events/:slug/ticket_types/:tt/consent_requirements (public)
 *   - GET /public/events/:slug/ticket_types/:tt/registration_schema (public)
 *   - POST /phone_verifications/:id/verify → verification_token
 *   - POST /public/ticket_views/:token/request_otp (+ POST /registrations/:id/claim_guest)
 */

import { apiFetch } from "@/lib/api";

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
   * POST /phone_verifications/:challenge_id/verify — trades the OTP code for a
   * `verification_token` (same shared phone-proof endpoint the ticket-transfer
   * flow uses, and the guest admission/waitlist OTP preflights). The token is
   * consumed by the admission-selection and offer-waitlist submits.
   */
  async verifyPhoneOtp(challengeId: string, code: string): Promise<{ verificationToken: string }> {
    const { data } = await apiFetch<{ verification_token: string }>(
      `phone_verifications/${challengeId}/verify`,
      { method: "POST", body: { code } },
    );
    return { verificationToken: data.verification_token };
  },

  /**
   * Guest ticket → account claim (#31 resolved 2026-09-10). Starts OTP proof
   * against the guest's phone for a SIGNED ticket-view token
   * (`UserTicket.ticketViewToken`, served by GuestPaymentTicketSerializer).
   * POST /public/ticket_views/:token/request_otp — body `{ phone }`
   * (Idempotency-Key injected). Only valid while the ticket's owner is still a
   * shadow guest (unverified, no password). Returns the challenge to feed
   * `verifyPhoneOtp`.
   */
  async claimOtpRequest(
    viewToken: string,
    phone: string,
  ): Promise<{ challengeId: string; status: string; expiresAt: string }> {
    const { data } = await apiFetch<{
      challenge_id: string;
      status: string;
      expires_at: string;
    }>(`public/ticket_views/${viewToken}/request_otp`, {
      method: "POST",
      body: { phone },
    });
    return { challengeId: data.challenge_id, status: data.status, expiresAt: data.expires_at };
  },

  /**
   * POST /registrations/:id/claim_guest — upgrades a shadow guest to a real
   * account after OTP proof. Body `{ phone, verification_token, password,
   * password_confirmation }` (password ≥ 8 chars). Sets the password + marks
   * the identity verified, then returns fresh auth tokens — the caller signs
   * the user in and the ticket lands in the account wallet (`GET /tickets`).
   * `claim_already_completed` when the owner is no longer a guest.
   */
  async claimGuest(
    registrationId: string,
    input: {
      phone: string;
      verificationToken: string;
      password: string;
      passwordConfirmation: string;
    },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { data } = await apiFetch<{ access_token: string; refresh_token: string }>(
      `registrations/${registrationId}/claim_guest`,
      {
        method: "POST",
        body: {
          phone: input.phone,
          verification_token: input.verificationToken,
          password: input.password,
          password_confirmation: input.passwordConfirmation,
        },
      },
    );
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  },

};

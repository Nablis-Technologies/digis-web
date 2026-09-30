/**
 * Waitlist module — offer-scoped public waitlist enrollment, mirroring the
 * backend contract (`digis_backend` @ 326f6a3).
 *
 *   POST /public/events/:event_slug/admission_offers/:event_product_id/waitlist
 *   POST /public/events/:event_slug/admission_offers/:event_product_id/waitlist/request_otp
 *
 * The waitlist is per sold-out OFFER, not per event. A supplied bearer token is
 * mandatory to validate (never silently downgraded to guest identity); guests
 * prove their phone with the OTP challenge.
 */

import { apiFetch } from "@/lib/api";
import type { ConsentDocument } from "@/lib/registration";
import type { AdmissionAnswerInput } from "@/lib/admission";

export interface WaitlistJoinInput {
  eventProductId: string;
  phone?: string;
  verificationToken?: string;
  email?: string;
  fullName?: string;
  quantity?: number;
  selectedEventDateId?: string;
  accessCode?: string;
  invitationToken?: string;
  answers?: AdmissionAnswerInput[];
  consents?: ConsentDocument[];
}

export interface WaitlistResult {
  registrationId: string;
  status: string;
  /** "waitlisted" on success. */
  nextAction: string;
}

export interface WaitlistOtpChallenge {
  challengeId: string;
  status: string;
  expiresAt: string;
}

interface WireRegistration {
  registration: { id: string; status: string };
  next_action: { type: string };
}

function wireRoot(input: Omit<WaitlistJoinInput, "eventProductId">) {
  return {
    waitlist: {
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.verificationToken ? { verification_token: input.verificationToken } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.fullName ? { full_name: input.fullName } : {}),
      ...(typeof input.quantity === "number" ? { quantity: input.quantity } : {}),
      ...(input.selectedEventDateId ? { selected_event_date_id: input.selectedEventDateId } : {}),
      ...(input.accessCode ? { access_code: input.accessCode } : {}),
      ...(input.invitationToken ? { invitation_token: input.invitationToken } : {}),
      ...(input.answers && input.answers.length > 0
        ? {
            answers: input.answers.map((a) => ({
              ...(a.formVersionId ? { form_version_id: a.formVersionId } : {}),
              question_key: a.questionKey,
              value: a.value,
            })),
          }
        : {}),
      ...(input.consents && input.consents.length > 0
        ? {
            consents: input.consents.map((c) => ({
              consent_document_version_id: c.versionId,
              content_sha256: c.contentSha256,
            })),
          }
        : {}),
    },
  };
}

export const waitlistModule = {
  /** Guest OTP preflight for joining a sold-out offer's waitlist. */
  async requestOtp(
    slug: string,
    eventProductId: string,
    input: { phone: string; quantity?: number; selectedEventDateId?: string; accessCode?: string; invitationToken?: string },
  ): Promise<WaitlistOtpChallenge> {
    const { data } = await apiFetch<{ challenge_id: string; status: string; expires_at: string }>(
      `public/events/${slug}/admission_offers/${eventProductId}/waitlist/request_otp`,
      { method: "POST", body: wireRoot(input) },
    );
    return { challengeId: data.challenge_id, status: data.status, expiresAt: data.expires_at };
  },

  /** Join the waitlist for one sold-out offer. */
  async join(slug: string, input: WaitlistJoinInput): Promise<WaitlistResult> {
    const { data } = await apiFetch<WireRegistration>(
      `public/events/${slug}/admission_offers/${input.eventProductId}/waitlist`,
      { method: "POST", body: wireRoot(input) },
    );
    return {
      registrationId: data.registration.id,
      status: data.registration.status,
      nextAction: data.next_action.type,
    };
  },
};

/**
 * Admission module — the deep module mirroring the backend's composable
 * admission-selection contract (verified against `digis_backend` @
 * `feat/launch-hardening-telemetry` 326f6a3).
 *
 * An event is a container of ticket offers. A buyer submits a *selection* of
 * offers and the server produces registrations + a quote + one order, then
 * hands back a `next_action` the UI branches on:
 *
 *   POST /public/events/:slug/admission_selections        (Idempotency-Key required)
 *   POST /public/events/:slug/admission_selections/request_otp
 *
 * Auth is optional; a supplied bearer token must be valid. Guests must either
 * confirm their phone (`phone_confirmation: true`) or carry a `verification_token`
 * from the phone-OTP flow. A free guest selection with neither returns the
 * `phone_verification_required` error (422) — branch on the CODE, not a next_action.
 *
 * The backend rejects mixing a `manual`-approval offer with any other item
 * (`admission_selection_manual_approval_mixed`); submit those alone.
 */

import { apiFetch, randomUuid } from "@/lib/api";
import type { ConsentDocument } from "@/lib/registration";

/* ─── Domain input ─── */

export interface AdmissionAnswerInput {
  formVersionId?: string;
  questionKey: string;
  value: unknown;
}

export interface AdmissionItemInput {
  /** Catalog::EventProduct id. */
  eventProductId: string;
  quantity: number;
  /** Only for an accepted-waitlist offer being checked out. */
  registrationId?: string;
  /** Required when the offer's ticket_type.date_selection is `choose_one`. */
  selectedEventDateId?: string;
  /** Optional event_date_ids for date-scoped add-ons (parking, extras). */
  eventDateIds?: string[];
  /** Audience-proof for a gated offer (audience != public). */
  accessCode?: string;
  invitationToken?: string;
  answers?: AdmissionAnswerInput[];
  consents?: ConsentDocument[];
}

export interface AdmissionSelectionInput {
  items: AdmissionItemInput[];
  /** Defaults to ETB. */
  chargeCurrency?: string;
  promotionCode?: string;
  /** Guest identity (required for unauthenticated buyers). */
  phone?: string;
  phoneConfirmation?: boolean;
  verificationToken?: string;
  email?: string;
  fullName?: string;
}

/* ─── Domain output ─── */

/** Core handoff values. `requires_order`/`waitlisted`/`rejected`/… come from
 *  the registration; `checkout_required`/`issuing`/`confirmed` from the order. */
export type AdmissionNextActionType =
  | "checkout_required"
  | "confirmed"
  | "issuing"
  | "awaiting_approval"
  | "waitlist_available"
  | "requires_order"
  | "waitlisted"
  | "rejected"
  | "cancelled"
  | "expired";

export interface AdmissionNextAction {
  type: AdmissionNextActionType | (string & {});
  orderId?: string;
  chargeCurrency?: string;
  amountMinor?: number;
  expiresAt?: string;
  registrationId?: string;
  /** Sold-out product ids when type === "waitlist_available". */
  eventProductIds?: string[];
}

export interface AdmissionOrder {
  id: string;
  status: string;
  chargeCurrency: string;
  totalMinor: number;
  expiresAt?: string;
}

export interface AdmissionRegistration {
  id: string;
  status: string;
  nextAction: string;
}

export interface AdmissionResult {
  order?: AdmissionOrder;
  registration?: { id: string; status: string };
  registrations: AdmissionRegistration[];
  nextAction: AdmissionNextAction;
  /** Bound to the order for guest payment endpoints (`order_access_token`). */
  guestOrderToken?: string;
}

export interface AdmissionOtpChallenge {
  challengeId: string;
  status: string;
  expiresAt: string;
}

/* ─── Wire types ─── */

interface WireNextAction {
  type: string;
  order_id?: string;
  charge_currency?: string;
  amount_minor?: number;
  expires_at?: string | null;
  registration_id?: string;
  event_product_ids?: string[];
}

interface WireOrder {
  id: string;
  status: string;
  charge_currency: string;
  total_minor: number;
  expires_at?: string | null;
}

interface WireSelectionResponse {
  order?: WireOrder | null;
  registration?: { id: string; status: string } | null;
  registrations?: Array<{ id: string; status: string; next_action: string }> | null;
  next_action: WireNextAction;
  guest_order_token?: string;
}

/* ─── Mapping ─── */

function wireItems(items: AdmissionItemInput[]) {
  return items.map((item) => {
    const requestUuid = randomUuid();
    return {
      event_product_id: item.eventProductId,
      quantity: item.quantity,
      ...(item.registrationId ? { registration_id: item.registrationId } : {}),
      ...(item.selectedEventDateId ? { selected_event_date_id: item.selectedEventDateId } : {}),
      ...(item.eventDateIds && item.eventDateIds.length > 0 ? { event_date_ids: item.eventDateIds } : {}),
      ...(item.accessCode || item.invitationToken
        ? {
            audience_proof: {
              ...(item.accessCode ? { access_code: item.accessCode } : {}),
              ...(item.invitationToken ? { invitation_token: item.invitationToken } : {}),
            },
          }
        : {}),
      ...(item.answers !== undefined
        ? {
            answers: item.answers.map((answer) => ({
              ...(answer.formVersionId ? { form_version_id: answer.formVersionId } : {}),
              question_key: answer.questionKey,
              value: answer.value,
            })),
          }
        : {}),
      ...(item.consents !== undefined
        ? {
            consents: item.consents.map((consent) => ({
              consent_document_version_id: consent.versionId,
              request_uuid: requestUuid,
              acceptance_method: "checkbox",
              content_sha256: consent.contentSha256,
              idempotency_key: `consent-${consent.versionId}-${requestUuid}`,
            })),
          }
        : {}),
    };
  });
}

function wireEnvelope(input: AdmissionSelectionInput) {
  return {
    admission_selection: {
      charge_currency: input.chargeCurrency ?? "ETB",
      ...(input.promotionCode ? { promotion_code: input.promotionCode } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.phoneConfirmation ? { phone_confirmation: true } : {}),
      ...(input.verificationToken ? { verification_token: input.verificationToken } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.fullName ? { full_name: input.fullName } : {}),
      items: wireItems(input.items),
    },
  };
}

function mapNextAction(wire: WireNextAction): AdmissionNextAction {
  return {
    type: wire.type,
    ...(wire.order_id ? { orderId: wire.order_id } : {}),
    ...(wire.charge_currency ? { chargeCurrency: wire.charge_currency } : {}),
    ...(typeof wire.amount_minor === "number" ? { amountMinor: wire.amount_minor } : {}),
    ...(wire.expires_at ? { expiresAt: wire.expires_at } : {}),
    ...(wire.registration_id ? { registrationId: wire.registration_id } : {}),
    ...(wire.event_product_ids && wire.event_product_ids.length > 0
      ? { eventProductIds: wire.event_product_ids }
      : {}),
  };
}

function mapResult(wire: WireSelectionResponse): AdmissionResult {
  return {
    ...(wire.order
      ? {
          order: {
            id: wire.order.id,
            status: wire.order.status,
            chargeCurrency: wire.order.charge_currency,
            totalMinor: wire.order.total_minor,
            ...(wire.order.expires_at ? { expiresAt: wire.order.expires_at } : {}),
          },
        }
      : {}),
    ...(wire.registration ? { registration: { id: wire.registration.id, status: wire.registration.status } } : {}),
    registrations: (wire.registrations ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      nextAction: r.next_action,
    })),
    nextAction: mapNextAction(wire.next_action),
    ...(wire.guest_order_token ? { guestOrderToken: wire.guest_order_token } : {}),
  };
}

/* ─── Module ─── */

export const admissionModule = {
  /**
   * POST /public/events/:slug/admission_selections/request_otp — preflight OTP
   * for a guest whose selection evaluates to a $0 total. Same envelope as
   * `create`, but only `phone`, `charge_currency`, `items` (+ optional promo)
   * are consumed. Returns the phone-verification challenge to trade via
   * `verifyPhoneOtp` (registration module).
   */
  async requestOtp(slug: string, input: AdmissionSelectionInput): Promise<AdmissionOtpChallenge> {
    const { data } = await apiFetch<{ challenge_id: string; status: string; expires_at: string }>(
      `public/events/${slug}/admission_selections/request_otp`,
      { method: "POST", body: wireEnvelope(input) },
    );
    return { challengeId: data.challenge_id, status: data.status, expiresAt: data.expires_at };
  },

  /**
   * POST /public/events/:slug/admission_selections — the unified submit.
   * `idempotencyKey` should be stable across a retried submit so the backend
   * replay store returns the same outcome instead of creating a second order.
   */
  async create(
    slug: string,
    input: AdmissionSelectionInput,
    idempotencyKey: string = randomUuid(),
  ): Promise<AdmissionResult> {
    const { data } = await apiFetch<WireSelectionResponse>(
      `public/events/${slug}/admission_selections`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: wireEnvelope(input),
      },
    );
    return mapResult(data);
  },
};

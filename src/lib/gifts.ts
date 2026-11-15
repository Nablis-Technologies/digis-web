/**
 * Gifts module — owns gift purchase resolution, recipient claiming, and buyer redelivery.
 * Mirrors digis_backend's public and buyer gift endpoints:
 *   - POST /public/gift_purchases/:id/resolve  { gift: { token } }
 *   - POST /public/gift_purchases/:id/claim    { gift: { token, answers?, consents? } }
 *   - GET  /orders/:order_id/gift_purchases
 *   - POST /orders/:order_id/gift_purchases/:id/resend
 */

import { apiFetch } from "@/lib/api";

export interface GiftPurchaseStatus {
  line_id?: string | null;
  id: string;
  status: 'pending_payment' | 'ready' | 'pending_recipient_consent' | 'claimed' | 'expired' | 'revoked';
  expires_at: string;
  delivery_status: 'pending' | 'sent' | 'partial' | 'failed';
  delivered_at: string | null;
  claimed_at: string | null;
}

export interface GiftFormQuestion {
  id: string;
  key: string;
  type: string;
  response_scope: string;
  label: string;
  required: boolean;
  options?: { key: string; label: string }[];
  validation_rules?: {
    min_length?: number; max_length?: number; min_items?: number; max_items?: number;
    allowed_option_keys?: string[]; min_date?: string; max_date?: string;
  };
}

export interface GiftFormVersion {
  id: string;
  registration_form_id: string;
  name: string;
  version: number;
  questions: GiftFormQuestion[];
}

export interface GiftConsentVersion {
  id: string;
  version: number;
  title: string;
  body: string;
  content_sha256: string;
  required: boolean;
  acceptance_scope: string;
}

export interface GiftClaimedTicket {
  id: string;
  status: string;
  event_id: string;
  event_title: string;
  product_id: string;
  product_name: string;
  credential_status?: string;
  qr_token?: string | null;
  lookup_code?: string | null;
}

export interface ResolvedGiftView {
  gift: {
    id: string;
    status: 'pending_payment' | 'ready' | 'pending_recipient_consent' | 'claimed' | 'expired' | 'revoked';
    expires_at: string;
    note?: string | null;
  };
  event: {
    id: string;
    slug: string;
    title: string;
  };
  product: {
    id: string;
    name: string;
    description?: string | null;
    admissions_per_unit: number;
  };
  forms?: GiftFormVersion[];
  consents?: GiftConsentVersion[];
  ticket?: GiftClaimedTicket | null;
  pending_consents?: Array<{
    id: string;
    consent_document_version_id: string;
    acceptance_scope: string;
    package_unit_number?: number | null;
    admission_position?: number | null;
    required: boolean;
  }>;
}

export interface ClaimGiftInput {
  token: string;
  answers?: Array<{
    question_key: string;
    value: unknown;
    form_version_id?: string;
    package_unit_number?: number;
    admission_position?: number;
  }>;
  consents?: Array<{
    consent_document_version_id: string;
    content_sha256: string;
    package_unit_number?: number;
    admission_position?: number;
    request_uuid?: string;
    acceptance_method?: 'checkbox';
    idempotency_key?: string;
  }>;
}

export const giftService = {
  /** Resolve bearer gift capability for recipient view. */
  async resolveGift(giftId: string, token: string): Promise<ResolvedGiftView> {
    const { data } = await apiFetch<ResolvedGiftView>(`public/gift_purchases/${encodeURIComponent(giftId)}/resolve`, {
      method: "POST",
      body: { gift: { token } },
    });
    return data;
  },

  /** Recipient claims gift ticket with optional registration form answers and consents. */
  async claimGift(giftId: string, input: ClaimGiftInput, idempotencyKey?: string): Promise<ResolvedGiftView> {
    const { data } = await apiFetch<ResolvedGiftView>(`public/gift_purchases/${encodeURIComponent(giftId)}/claim`, {
      method: "POST",
      ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
      body: {
        gift: {
          token: input.token,
          answers: input.answers ?? [],
          consents: input.consents ?? [],
        },
      },
    });
    return data;
  },

  /** Buyer fetches delivery status of all gift tickets in an order. */
  async fetchOrderGifts(orderId: string): Promise<GiftPurchaseStatus[]> {
    const { data } = await apiFetch<GiftPurchaseStatus[]>(`orders/${encodeURIComponent(orderId)}/gift_purchases`);
    return Array.isArray(data) ? data : [];
  },

  /** Buyer resends gift notification SMS/email. */
  async resendGift(orderId: string, giftId: string, idempotencyKey?: string): Promise<GiftPurchaseStatus> {
    const { data } = await apiFetch<GiftPurchaseStatus>(`orders/${encodeURIComponent(orderId)}/gift_purchases/${encodeURIComponent(giftId)}/resend`, {
      method: "POST",
      ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
    });
    return data;
  },
};

/** Preserve checkout recipient order without persisting recipient contact details. */
export function giftsInRecipientOrder(orderId: string, gifts: GiftPurchaseStatus[]): GiftPurchaseStatus[] {
  let lineIds: string[] = [];
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(`digis:gift-lines:${orderId}`) ?? '[]');
    if (Array.isArray(saved) && saved.every(value => typeof value === 'string')) lineIds = saved;
  } catch { /* Storage is optional; keep server ordering for older orders. */ }
  const rank = (gift: GiftPurchaseStatus) => {
    const index = gift.line_id ? lineIds.indexOf(gift.line_id) : -1;
    return index < 0 ? lineIds.length : index;
  };
  return [...gifts].sort((a, b) => rank(a) - rank(b));
}

/**
 * Error normalization for the digis_backend API.
 *
 * Backend errors are `{ success: false, error, message?, code }` with `code` at
 * the top level (flat). This module maps a thrown error to a typed `ApiError`
 * and, for the UI, to user-readable text. Used by both the toast layer and
 * inline form errors.
 */

/** Normalized API error — carries the backend's flat `code` plus HTTP status. */
export class ApiError extends Error {
  status: number;
  code?: string;
  /** Per-field messages from the backend (e.g. ["Phone has already been taken"]). */
  fieldErrors?: string[];
  /** Machine-readable error context (backend `meta`) — e.g. the
   *  `active_checkout` recovery on a 409 conflict (#58). Absent when the
   *  backend sends none. */
  meta?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    fieldErrors?: string[],
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.meta = meta;
  }
}

/** Friendly copy for known backend error codes (fall back to the API message). */
const CODE_MESSAGES: Record<string, string> = {
  correction_window_closed: 'The correction window has closed. This answer can no longer be changed.',
  answer_erased: 'This answer is no longer retained and cannot be changed.',
  retention_expired: 'This answer is no longer retained and cannot be changed.',
  invalid_answer_revision: 'Check this answer and the event’s allowed values, then try again.',
  revision_conflict: 'This correction conflicts with an earlier request. Refresh your answers before trying again.',
  gift_invalid: 'This gift link is invalid. Open the original message link and try again.',
  gift_not_ready: 'This gift order is still awaiting payment confirmation.',
  gift_expired: 'This gift ticket has expired.',
  gift_revoked: 'This gift purchase was refunded or cancelled by the purchaser.',
  gift_recipient_authentication_required: 'Sign in with the recipient account to claim this gift.',
  gift_recipient_mismatch: 'This gift belongs to another account. Use the recipient account to continue.',
  gift_refund_in_progress: 'A refund is being processed for this gift. It cannot be claimed right now.',
  gift_claim_invalid: 'Please check your attendee details and required consents.',
  gift_claim_failed: 'Couldn’t complete your gift claim. Please try again.',
  gift_quantity_invalid: 'Send one gift ticket per recipient.',
  gift_recipient_same_as_purchaser: 'You cannot send a gift ticket to your own phone number.',
  recipient_phone_invalid: 'Enter a valid recipient phone number.',
  invalid_credentials: 'Incorrect email/phone or password.',
  authentication_required: 'Please log in to continue.',
  guest_requires_authentication: 'This phone is already linked to a Digis account. Log in to continue — or open a guest ticket under Tickets.',
  token_expired: 'Your session expired. Please log in again.',
  token_revoked: 'Your session was revoked. Please log in again.',
  invalid_token: 'Your session is invalid. Please log in again.',
  signup_failed: 'We couldn’t create your account just now. Please try again in a moment.',
  missing_idempotency_key: 'Something went wrong — please try again.',
  account_deactivated: 'This account has been deactivated.',
  invalid_device: 'This device is no longer trusted. Please log in again.',
  // Checkout / payment codes (Orders) — verified against the live API.
  payment_provider_unavailable: 'Online payment isn’t available right now. Please try again later.',
  invalid_payment_provider: 'This payment provider is not supported.',
  invalid_payment_method: 'This payment method is not supported.',
  payment_method_unsupported: 'The provider does not support this payment method.',
  payment_currency_unsupported: 'The provider does not support this currency.',
  payment_already_accepted: 'This order was already paid.',
  payment_attempt_limit_reached: 'Too many payment attempts. Please contact support.',
  payment_attempt_expired: 'This checkout expired. Please start a new order.',
  active_checkout_exists: 'You already have a checkout in progress for this event.',
  registration_required: 'Please complete attendee registration first.',
  active_registration_conflict: 'You already have an active registration for this ticket.',
  commercial_terms_unavailable: 'We couldn’t load this event’s terms right now. Please try again in a moment.',
  commercial_requote_required: 'The event’s pricing changed — your checkout was refreshed. Please review and try again.',
  quote_expired: 'Your checkout quote expired. Please retry payment to refresh it.',
  invalid_guest_quote: 'We couldn’t verify this guest purchase — the checkout link is stale or was used for a different order. Check the SMS link we sent for your ticket, or Tickets on this device.',
  rate_limited: 'Too many attempts — please wait a minute and try again.',
  // Promo codes — validated server-side at quote time.
  invalid_promotion_code: 'This promo code is not valid for this event.',
  promotion_unavailable: 'This promo code cannot be applied to your tickets.',
  // Order / payment ownership and state.
  payment_order_not_owned: 'This order belongs to a different account.',
  event_cancelled: 'This event has been cancelled and can no longer accept payments.',
  payment_succeeded_pending_acceptance: 'A payment for this order is already being confirmed.',
  checkout_restart_payment_in_progress: 'A payment is in progress for this checkout — please wait for it to finish.',
  checkout_restart_unavailable: 'That earlier checkout is already finished. Please start a new order.',
  payment_attempt_unavailable: 'This checkout can no longer take payment (it may have expired). Please start a new order.',
  payment_idempotency_conflict: 'A different payment is already in progress for this order.',
  idempotency_conflict: 'This was already submitted — wait a moment and check Tickets or My Listings before retrying.',
  // Registration / consent (Ticketing).
  phone_identity_unverified: 'Your phone number needs to be verified before you can buy tickets.',
  missing_required_buyer_consent: 'Please accept all required event terms to continue.',
  consent_requirement_not_pending: 'This event’s terms changed — please review and accept them again.',
  required_buyer_consent_missing: 'Please accept all required event terms to continue.',
  invalid_submission: 'Some registration details were rejected — please check and try again.',
  // Guest ticket → account claim (guest_claim purpose).
  claim_already_completed: 'This ticket is already linked to an account.',
  verification_invalid: 'That verification code is no longer valid — please try again.',
  password_invalid: 'Password must be at least 8 characters.',
  // Checkout purchase-limit reservations (Ticketing) — the order step needs a
  // configured purchase limit on the ticket type to commit its allocations.
  purchase_limit_allocations_missing: 'This ticket type has no purchase limit configured — the organizer needs to set one.',
  purchase_limit_exceeded: 'You have reached the purchase limit for this ticket type.',
  // Composable admission selection (Orders::AdmissionSelections) — the unified
  // selection → order path that replaced register → quote → create-order.
  phone_verification_required: 'Verify your phone number to confirm this free admission.',
  phone_confirmation_required: 'Confirm your phone number to continue.',
  phone_verification_invalid: 'That verification code is invalid or expired — please request a new one.',
  phone_identity_invalid: 'Enter a valid phone number.',
  admission_selection_invalid: 'We couldn’t process that ticket selection — please review and try again.',
  admission_selection_manual_approval_mixed: 'Approval-required tickets must be requested on their own.',
  items_required: 'Select at least one ticket to continue.',
  duplicate_product: 'Each ticket type can only be selected once.',
  quantity_invalid: 'That quantity isn’t available — adjust it and try again.',
  product_not_found: 'One of those tickets is no longer available.',
  product_unavailable: 'One of those tickets is no longer available.',
  inventory_unavailable: 'One of those tickets just sold out.',
  inventory_not_configured: 'Tickets for this event aren’t set up yet.',
  inventory_validation_failed: 'We couldn’t reserve those tickets — please try again.',
  event_date_unavailable: 'That date is no longer available.',
  event_dates_event_mismatch: 'That date doesn’t belong to this event.',
  venue_dates_required: 'Choose a date to continue.',
  // Audience gating (invite-only / access-code events).
  no_valid_code_or_invitation: 'This access code or invitation is not valid for this event.',
  // Seller payout destinations (Marketplace) — verified against the backend
  // locale (Chapa V2). bank_code gave way to bank_slug; the token/verification
  // -pending codes were dropped and the verify/manual-review codes added.
  payout_account_provider_unavailable: 'Payout verification is unavailable right now — try again later.',
  payout_account_input_invalid: 'Those payout details were rejected — check the holder name and account number and try again.',
  payout_account_bank_unsupported: 'The selected bank is not supported by the payout provider.',
  payout_account_verification_failed: 'The provider could not verify this account — check the details and try again.',
  payout_account_verification_required: 'Verification needs a reason and an evidence reference.',
  payout_account_not_verifiable: 'This payout account is not eligible for verification.',
  payout_account_not_found: 'That payout account could not be found.',
  payout_account_conflict: 'This destination is already registered.',
  payout_account_invalid: 'This destination could not be saved — check the details and try again.',
  // Seller payout withdrawals (Marketplace::SellerPayouts) — verified against the
  // backend locale (f679e56). The `seller_payout_not_matured` /
  // `seller_payout_event_scope_invalid` codes were removed upstream.
  seller_payout_account_required: 'Add a verified payout destination before you can cash out.',
  seller_payout_currency_invalid: 'That currency isn’t supported for payouts.',
  seller_payout_amount_invalid: 'Enter a valid amount to cash out.',
  seller_payout_seller_ineligible: 'Your account isn’t eligible for payouts.',
  seller_payout_source_not_found: 'The balance for this payout could not be found.',
  seller_payout_balance_not_positive: 'You have no available balance to cash out.',
  seller_payout_replay_missing: 'Something went wrong completing this payout — please try again.',
  seller_payout_not_dispatchable: 'This payout isn’t ready to be sent yet.',
  // Resale listings (Marketplace) — verified against the backend locale.
  resale_disabled: 'Resale is not enabled for this ticket type.',
  asking_amount_exceeds_cap: 'That price is above this event’s resale cap — lower your asking price and try again.',
  resale_cutoff_passed: 'The listing window for this event has closed.',
  ticket_not_active: 'Only active tickets can be listed for resale.',
  listing_already_open: 'This ticket already has an open listing — see My Listings.',
  listing_forbidden: 'Only the ticket owner can list it for resale.',
  paid_acquisition_required: 'Only paid tickets can be resold.',
  package_already_used: 'This ticket has already been used and can’t be listed.',
  resale_count_exhausted: 'This ticket has reached its resale limit.',
  pending_transfer: 'This ticket has a pending transfer — resolve it before listing.',
  active_claim: 'This ticket has an active claim — resolve it before listing.',
  active_refund: 'This ticket has a refund in progress — try again once it settles.',
  package_suspended: 'This ticket is temporarily suspended and can’t be listed right now.',
  package_dead: 'This ticket is no longer valid and can’t be listed.',
  group_mode_required: 'This ticket can’t be listed for resale in its current form.',
  listing_not_found: 'That listing is no longer available.',
  listing_reserved: 'Someone just beat you to it — this listing is no longer available.',
  listing_not_open: 'This listing is no longer open.',
  buyer_checkout_active: 'You already have a checkout in progress for this event — finish it first.',
  commercial_terms_changed: 'The event’s pricing just changed — please try again.',
  listing_seller_changed: 'The listing just changed — please try again.',
  reservation_payment_accepted: 'Payment is already being processed for this listing, so it can’t be cancelled.',
  // Ticket transfers (Ticketing) — verified against the backend locale.
  invalid_transfer: 'This transfer link is invalid or has expired. Ask the sender to share a new one.',
  transfer_invalid: 'This transfer link is invalid or has expired. Ask the sender to share a new one.',
  transfer_not_enabled: 'Transfers are not enabled for this ticket type.',
  transfer_forbidden: 'Only the ticket owner can transfer it.',
  transfer_already_pending: 'This ticket already has a pending transfer — resolve it first.',
  transfer_recipient_same_as_owner: 'You can’t transfer a ticket to yourself.',
  transfer_cutoff_passed: 'The transfer window for this event has closed.',
  transfer_phone_required: 'Enter the recipient’s phone number to continue.',
  transfer_acceptance_failed: 'We couldn’t complete this transfer — check the code and try again.',
  transfer_recipient_mismatch: 'This claim doesn’t match the recipient phone on the transfer.',
  transfer_expired: 'This transfer has expired. Ask the sender to send it again.',
  transfer_not_pending: 'This transfer is no longer pending — refresh your tickets to see its status.',
  transfer_recipient_unverified: 'Verify your account before accepting this transfer.',
  // Phone verification (Core) — used by guest claim + transfer OTP.
  code_invalid: 'That code isn’t right — check it and try again.',
  attempts_exhausted: 'Too many wrong codes. Request a new one and try again.',
  phone_mismatch: 'That phone doesn’t match the one on this transfer.',
  challenge_not_found: 'This verification code has expired — request a new one.',
  // User profile & avatar management (G-14 & G-47)
  avatar_route_required: 'Avatar changes must be made through the avatar management endpoint.',
  profile_required: 'Please set your first and last name before uploading a photo.',
  invalid_avatar: 'Please choose a valid image file (JPEG, PNG, or WebP up to 5 MB).',
  avatar_not_found: 'No avatar image is currently set.',
  avatar_unavailable: 'Could not load your avatar image right now. Please try again later.',
  avatar_processing_unavailable: 'Could not process the uploaded image. Please try a different photo.',
};

/** Map a known backend `code` to friendly text, else the fallback. */
export function messageForCode(code: string | undefined, fallback: string): string {
  return (code && CODE_MESSAGES[code]) || fallback;
}

/* ─── Backend per-field error attribution ─── */

export type FieldErrorMap = {
  /** Message keyed by the form field it names (e.g. `{ phone: "…" }`). */
  fields: Record<string, string>;
  /** Messages that name no known field — show as a form-level banner. */
  general: string[];
};

/**
 * Recognized field tokens, most-specific first. Matching is on the message
 * text because the backend sends `e.record.errors.full_messages` (e.g.
 * "Phone has already been taken") with no machine-readable field key.
 */
const FIELD_MATCHERS: ReadonlyArray<{ field: string; pattern: RegExp }> = [
  { field: 'passwordConfirmation', pattern: /password confirmation|passwords? (?:do(?:es)? not|don'?t) match|confirmation/i },
  { field: 'firstName', pattern: /first[ _]?name/i },
  { field: 'lastName', pattern: /last[ _]?name/i },
  { field: 'phone', pattern: /phone|mobile/i },
  { field: 'email', pattern: /email/i },
  { field: 'name', pattern: /\bname\b/i },
  { field: 'password', pattern: /password/i },
];

/**
 * Split a backend `fieldErrors` array into per-field messages plus a remainder.
 * First message wins per field; unrecognized messages go to `general`.
 */
export function mapFieldErrors(fieldErrors?: string[] | null): FieldErrorMap {
  const fields: Record<string, string> = {};
  const general: string[] = [];
  for (const raw of fieldErrors ?? []) {
    const message = raw?.trim();
    if (!message) continue;
    const hit = FIELD_MATCHERS.find((matcher) => matcher.pattern.test(message));
    if (hit) {
      // First message wins; later messages for the same field are dropped.
      if (!fields[hit.field]) fields[hit.field] = message;
    } else {
      general.push(message);
    }
  }
  return { fields, general };
}

/**
 * Normalize any thrown value into an `ApiError`. Understands axios errors
 * (error.response), the backend envelope ({ error, code }), and plain Errors.
 */
function normalizedFieldMessages(errors: unknown): string[] | undefined {
  if (Array.isArray(errors)) return errors.filter((message): message is string => typeof message === 'string');
  if (!errors || typeof errors !== 'object') return undefined;
  return Object.entries(errors).flatMap(([field, values]) => {
    const label = field.replace(/^profile\./, '').replace(/_/g, ' ');
    return (Array.isArray(values) ? values : [values])
      .filter((value): value is string => typeof value === 'string')
      .map(value => `${label} ${value}`);
  });
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const anyError = error as {
    isAxiosError?: boolean;
    response?: { status?: number; data?: unknown };
    request?: unknown;
    message?: string;
  };

  // axios-style error with a response
  if (anyError?.response) {
    const status = anyError.response.status ?? 0;
    const body = anyError.response.data as
      | { error?: string | { error?: string; message?: string; code?: string; errors?: string[]; meta?: Record<string, unknown> }; message?: string; code?: string; errors?: string[]; meta?: Record<string, unknown> }
      | string
      | undefined;
    const data: { error?: string; message?: string; code?: string; errors?: string[]; meta?: Record<string, unknown> } =
      body == null
        ? {}
        : typeof body === 'object' && typeof body.error === 'object' && body.error !== null
          ? body.error
          : (body as { error?: string; message?: string; code?: string; errors?: string[]; meta?: Record<string, unknown> });
    const message = (typeof data.error === 'string' && data.error) || data.message || `Request failed (${status})`;
    return new ApiError(message, status, data.code, normalizedFieldMessages(data.errors), data.meta);
  }

  // network / timeout / no response
  if (anyError?.isAxiosError) {
    return new ApiError(anyError.message || 'Network error — check your connection.', 0, 'network_error');
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 0);
  }

  return new ApiError('Something went wrong.', 0);
}

/** Extract a user-readable message from any thrown value. */
export function mapApiError(error: unknown, fallback = 'Something went wrong.'): string {
  const api = toApiError(error);
  return messageForCode(api.code, api.message || fallback);
}

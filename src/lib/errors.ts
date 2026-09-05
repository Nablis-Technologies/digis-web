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

  constructor(message: string, status: number, code?: string, fieldErrors?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Friendly copy for known backend error codes (fall back to the API message). */
const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect email/phone or password.',
  authentication_required: 'Please log in to continue.',
  token_expired: 'Your session expired. Please log in again.',
  token_revoked: 'Your session was revoked. Please log in again.',
  invalid_token: 'Your session is invalid. Please log in again.',
  signup_failed: 'We could not create your account. Check your details and try again.',
  missing_idempotency_key: 'Something went wrong — please try again.',
  account_deactivated: 'This account has been deactivated.',
  invalid_device: 'This device is no longer trusted. Please log in again.',
  // Checkout / payment codes (Orders) — verified against the live API.
  payment_provider_unavailable: 'Online payments are not configured yet. The backend needs CHAPA_ENABLED=true plus Chapa API keys.',
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
  commercial_terms_unavailable: 'The organizer’s fee terms are not configured — the backend needs a commercial fee schedule for this event.',
  commercial_requote_required: 'The event’s pricing changed — your checkout was refreshed. Please review and try again.',
  quote_expired: 'Your checkout quote expired. Please retry payment to refresh it.',
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
  idempotency_conflict: 'This checkout was already submitted — please wait a moment and check Tickets.',
  // Registration / consent (Ticketing).
  phone_identity_unverified: 'Your phone number needs to be verified before you can buy tickets.',
  missing_required_buyer_consent: 'Please accept all required event terms to continue.',
  consent_requirement_not_pending: 'This event’s terms changed — please review and accept them again.',
  required_buyer_consent_missing: 'Please accept all required event terms to continue.',
  invalid_submission: 'Some registration details were rejected — please check and try again.',
  // Audience gating (invite-only / access-code events).
  no_valid_code_or_invitation: 'This access code or invitation is not valid for this event.',
};

/** Map a known backend `code` to friendly text, else the fallback. */
export function messageForCode(code: string | undefined, fallback: string): string {
  return (code && CODE_MESSAGES[code]) || fallback;
}

/**
 * Normalize any thrown value into an `ApiError`. Understands axios errors
 * (error.response), the backend envelope ({ error, code }), and plain Errors.
 */
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
      | { error?: string | { error?: string; message?: string; code?: string; errors?: string[] }; message?: string; code?: string; errors?: string[] }
      | string
      | undefined;
    const data: { error?: string; message?: string; code?: string; errors?: string[] } =
      body == null
        ? {}
        : typeof body === 'object' && typeof body.error === 'object' && body.error !== null
          ? body.error
          : (body as { error?: string; message?: string; code?: string; errors?: string[] });
    const message = (typeof data.error === 'string' && data.error) || data.message || `Request failed (${status})`;
    return new ApiError(message, status, data.code, data.errors);
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

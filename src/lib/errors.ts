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
      | { error?: string; message?: string; code?: string; errors?: string[] }
      | string
      | undefined;
    const data: { error?: string; message?: string; code?: string; errors?: string[] } =
      body && typeof body === 'object' ? body : { error: body };
    const message = data.error || data.message || `Request failed (${status})`;
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

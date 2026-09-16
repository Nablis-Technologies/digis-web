import { describe, it, expect } from 'vitest';
import { messageForCode, mapApiError, ApiError } from '@/lib/errors';

describe('resale + payout error copy', () => {
  it('maps every buyer-reachable resale code to actionable copy', () => {
    const codes = [
      'resale_disabled',
      'asking_amount_exceeds_cap',
      'resale_cutoff_passed',
      'ticket_not_active',
      'listing_already_open',
      'listing_forbidden',
      'paid_acquisition_required',
      'package_already_used',
      'resale_count_exhausted',
      'pending_transfer',
      'active_claim',
      'active_refund',
      'package_suspended',
      'package_dead',
      'group_mode_required',
      'commercial_terms_unavailable',
      'listing_not_found',
      'listing_reserved',
      'listing_not_open',
      'buyer_checkout_active',
      'commercial_terms_changed',
      'listing_seller_changed',
      'reservation_payment_accepted',
      'idempotency_conflict',
      'payout_account_provider_unavailable',
      'payout_account_input_invalid',
      'payout_account_bank_unsupported',
      'payout_account_verification_failed',
      'payout_account_verification_required',
      'payout_account_not_verifiable',
      'payout_account_not_found',
      'payout_account_conflict',
      'payout_account_invalid',
    ];
    for (const code of codes) {
      const copy = messageForCode(code, 'FALLBACK');
      expect(copy, code).not.toBe('FALLBACK');
      expect(copy, code).not.toContain(code);
    }
  });

  it('falls back gracefully for unmapped codes', () => {
    expect(messageForCode('sale_ledger_conflict', 'Something went wrong.')).toBe('Something went wrong.');
    expect(messageForCode(undefined, 'Something went wrong.')).toBe('Something went wrong.');
  });

  it('mapApiError reads the backend flat code', () => {
    const err = new ApiError('the resale listing is already reserved', 422, 'listing_reserved');
    expect(mapApiError(err)).toContain('beat you to it');
  });
});

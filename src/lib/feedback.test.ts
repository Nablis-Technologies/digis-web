import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { ApiError } from '@/lib/errors';
import { toastError, toastSuccess } from '@/lib/feedback';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockedToast = vi.mocked(toast);

beforeEach(() => {
  mockedToast.error.mockReset();
  mockedToast.success.mockReset();
});

describe('feedback (reuses the sonner host + mapApiError copy)', () => {
  it('toastError renders the mapped copy for a known backend code', () => {
    toastError(new ApiError('raw', 422, 'asking_amount_exceeds_cap'));
    expect(mockedToast.error).toHaveBeenCalledWith(
      'That price is above this event’s resale cap — lower your asking price and try again.',
    );
  });

  it('toastError uses the error’s own message when it has no known code', () => {
    toastError(new Error('boom'), 'Could not delist this ticket. Please try again.');
    expect(mockedToast.error).toHaveBeenCalledWith('boom');
  });

  it('toastError falls back for an error with no message at all', () => {
    toastError(new Error(''), 'Could not delist this ticket. Please try again.');
    expect(mockedToast.error).toHaveBeenCalledWith('Could not delist this ticket. Please try again.');
  });

  it('toastSuccess passes the message through', () => {
    toastSuccess('Payout method saved.');
    expect(mockedToast.success).toHaveBeenCalledWith('Payout method saved.');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import { ApiError } from '@/lib/errors';
import { audienceModule } from '@/lib/audience';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe('audienceModule.authorize (#20)', () => {
  it('posts to audience_authorizations with the ticket type + code', async () => {
    mockedApiFetch.mockResolvedValue({ data: { authorized: true, reason: 'access_code' } } as never);
    const res = await audienceModule.authorize({ ticketTypeId: 'tt-1', accessCode: 'VIP-CODE' });
    expect(res).toEqual({ authorized: true, reason: 'access_code' });
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'ticketing/audience_authorizations',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ ticket_type_id: 'tt-1', access_code: 'VIP-CODE' }),
      }),
    );
  });

  it('omits access_code/invitation_token when absent', async () => {
    mockedApiFetch.mockResolvedValue({ data: { authorized: true, reason: 'public' } } as never);
    await audienceModule.authorize({ ticketTypeId: 'tt-1' });
    const [, opts] = mockedApiFetch.mock.calls[0];
    expect((opts?.body as Record<string, unknown>).access_code).toBeUndefined();
    expect((opts?.body as Record<string, unknown>).invitation_token).toBeUndefined();
  });

  it('passes the invitation token when given', async () => {
    mockedApiFetch.mockResolvedValue({ data: { authorized: true, reason: 'invitation' } } as never);
    await audienceModule.authorize({ ticketTypeId: 'tt-1', invitationToken: 'tok-1' });
    const [, opts] = mockedApiFetch.mock.calls[0];
    expect((opts?.body as Record<string, unknown>).invitation_token).toBe('tok-1');
  });
});

describe('audienceModule.authorizeAny — gate across tiers', () => {
  it('is true when any tier authorizes', async () => {
    mockedApiFetch
      .mockResolvedValueOnce({ data: { authorized: false, reason: 'public' } } as never)
      .mockResolvedValueOnce({ data: { authorized: true, reason: 'access_code' } } as never);
    const ok = await audienceModule.authorizeAny(['tt-1', 'tt-2'], { accessCode: 'CODE' });
    expect(ok).toBe(true);
  });

  it('is false when every tier definitively rejects (422)', async () => {
    mockedApiFetch
      .mockResolvedValueOnce({ data: { authorized: false, reason: 'public' } } as never)
      .mockRejectedValueOnce(new ApiError('invalid code', 422, 'no_valid_code_or_invitation'));
    const ok = await audienceModule.authorizeAny(['tt-1', 'tt-2'], { accessCode: 'CODE' });
    expect(ok).toBe(false);
  });

  it('propagates a transient failure instead of blaming the code', async () => {
    mockedApiFetch
      .mockResolvedValueOnce({ data: { authorized: false, reason: 'public' } } as never)
      .mockRejectedValueOnce(new ApiError('network error', 0, 'network_error'));
    await expect(
      audienceModule.authorizeAny(['tt-1', 'tt-2'], { accessCode: 'CODE' }),
    ).rejects.toThrow('network error');
  });

  it('is false for an empty tier list', async () => {
    expect(await audienceModule.authorizeAny([], { accessCode: 'CODE' })).toBe(false);
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});

describe('audienceModule.resolveProof — one input, code or invitation', () => {
  it('returns an access-code proof when the value is a valid code', async () => {
    mockedApiFetch.mockResolvedValue({ data: { authorized: true, reason: 'access_code' } } as never);
    expect(await audienceModule.resolveProof(['tt-1'], 'DRILL-CODE')).toEqual({ accessCode: 'DRILL-CODE' });
  });

  it('falls back to an invitation proof when the code attempt is rejected', async () => {
    mockedApiFetch
      .mockRejectedValueOnce(new ApiError('invalid code', 422, 'no_valid_code_or_invitation'))
      .mockResolvedValueOnce({ data: { authorized: true, reason: 'invitation' } } as never);
    expect(await audienceModule.resolveProof(['tt-1'], 'tok-1')).toEqual({ invitationToken: 'tok-1' });
  });

  it('returns null when neither a code nor a token authorizes', async () => {
    mockedApiFetch.mockRejectedValue(new ApiError('invalid', 422, 'no_valid_code_or_invitation'));
    expect(await audienceModule.resolveProof(['tt-1'], 'nope')).toBeNull();
  });

  it('returns null for a blank value or empty tier list without calling the API', async () => {
    expect(await audienceModule.resolveProof(['tt-1'], '   ')).toBeNull();
    expect(await audienceModule.resolveProof([], 'CODE')).toBeNull();
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});

describe('audienceModule.proveInvitation — link token', () => {
  it('returns an invitation proof when the token authorizes', async () => {
    mockedApiFetch.mockResolvedValue({ data: { authorized: true, reason: 'invitation' } } as never);
    expect(await audienceModule.proveInvitation(['tt-1'], 'tok-1')).toEqual({ invitationToken: 'tok-1' });
    const [, opts] = mockedApiFetch.mock.calls[0];
    expect((opts?.body as Record<string, unknown>).invitation_token).toBe('tok-1');
  });

  it('returns null when the token is not valid', async () => {
    mockedApiFetch.mockRejectedValue(new ApiError('invalid', 422, 'no_valid_code_or_invitation'));
    expect(await audienceModule.proveInvitation(['tt-1'], 'bad')).toBeNull();
  });
});
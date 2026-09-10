import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
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

  it('is false when every tier rejects or errors', async () => {
    mockedApiFetch
      .mockResolvedValueOnce({ data: { authorized: false, reason: 'public' } } as never)
      .mockRejectedValueOnce(new Error('boom'));
    const ok = await audienceModule.authorizeAny(['tt-1', 'tt-2'], { accessCode: 'CODE' });
    expect(ok).toBe(false);
  });

  it('is false for an empty tier list', async () => {
    expect(await audienceModule.authorizeAny([], { accessCode: 'CODE' })).toBe(false);
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});
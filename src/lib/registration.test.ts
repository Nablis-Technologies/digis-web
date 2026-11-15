import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import { registrationModule } from '@/lib/registration';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  randomUuid: () => '00000000-0000-4000-8000-000000000000',
}));

const mockedApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe('registrationModule.fetchRegistrationSchema (#19 resolved)', () => {
  it('calls the public schema endpoint', async () => {
    mockedApiFetch.mockResolvedValue({
      data: {
        event_id: 'e-1',
        ticket_type_id: 'tt-1',
        forms: [{ id: 'fver-1', registration_form_id: 'rf-1', form_name: 'Standard', version: 3, questions: [] }],
      },
    } as never);
    const schema = await registrationModule.fetchRegistrationSchema('on-on', 'tt-1');
    expect(mockedApiFetch).toHaveBeenCalledWith('public/events/on-on/ticket_types/tt-1/registration_schema');
    expect(schema?.forms[0]?.id).toBe('fver-1');
    expect(schema?.forms[0]?.version).toBe(3);
  });
});

describe('registrationModule phone OTP', () => {
  it('verifyPhoneOtp trades the code for a verification_token', async () => {
    mockedApiFetch.mockResolvedValue({ data: { verification_token: 'vt-1' } } as never);
    const result = await registrationModule.verifyPhoneOtp('ch-1', '123456');
    expect(mockedApiFetch).toHaveBeenCalledWith('phone_verifications/ch-1/verify', expect.objectContaining({ method: 'POST' }));
    expect(result).toEqual({ verificationToken: 'vt-1' });
  });
});

describe('registrationModule guest ticket claim (#31 resolved)', () => {
  it('claimOtpRequest posts the phone against the signed view token', async () => {
    mockedApiFetch.mockResolvedValue({
      data: { challenge_id: 'ch-1', status: 'pending', expires_at: '2026-09-10T12:00:00Z' },
    } as never);
    const result = await registrationModule.claimOtpRequest('vt-9', '+251900000000');
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'public/ticket_views/vt-9/request_otp',
      expect.objectContaining({ method: 'POST', body: { phone: '+251900000000' } }),
    );
    expect(result).toEqual({ challengeId: 'ch-1', status: 'pending', expiresAt: '2026-09-10T12:00:00Z' });
  });

  it('claimGuest posts the OTP proof + password and returns auth tokens', async () => {
    mockedApiFetch.mockResolvedValue({
      data: { access_token: 'at-1', refresh_token: 'rt-1' },
    } as never);
    const result = await registrationModule.claimGuest('reg-9', {
      phone: '+251900000000',
      verificationToken: 'vt-9',
      password: 'password123',
      passwordConfirmation: 'password123',
    });
    expect(mockedApiFetch).toHaveBeenCalledWith(
      'registrations/reg-9/claim_guest',
      expect.objectContaining({
        method: 'POST',
        body: {
          phone: '+251900000000',
          verification_token: 'vt-9',
          password: 'password123',
          password_confirmation: 'password123',
        },
      }),
    );
    expect(result).toEqual({ accessToken: 'at-1', refreshToken: 'rt-1' });
  });
});
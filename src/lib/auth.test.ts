import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '@/lib/api';
import { authService, toAuthUser } from '@/lib/auth';
import type { AuthSessionWire } from '@/lib/auth';
import type { AuthUserWire } from '@/types/auth';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    fieldErrors?: string[];
    constructor(msg: string, fieldErrors?: string[]) {
      super(msg);
      this.fieldErrors = fieldErrors;
    }
  },
}));

const mockedApiFetch = vi.mocked(apiFetch);

function sampleUserWire(overrides: Partial<AuthUserWire> = {}): AuthUserWire {
  return {
    id: 'user-123',
    name: 'Abebe Bikila',
    email: 'abebe@example.com',
    phone: '+251911123456',
    verified_at: '2026-09-01T12:00:00Z',
    permissions: ['read:events'],
    roles: [{ id: 'role-1', code: 'attendee', name: 'Attendee', active: true }],
    ...overrides,
  };
}

function sampleSessionWire(): AuthSessionWire {
  return {
    access_token: 'acc-jwt-token',
    refresh_token: 'ref-jwt-token',
    user: sampleUserWire(),
  };
}

describe('toAuthUser mapping', () => {
  it('maps full wire shape correctly', () => {
    const user = toAuthUser(sampleUserWire());
    expect(user.id).toBe('user-123');
    expect(user.name).toBe('Abebe Bikila');
    expect(user.phone).toBe('+251911123456');
    expect(user.permissions).toEqual(['read:events']);
    expect(user.roles).toHaveLength(1);
  });

  it('displays single name without duplication when first_name equals last_name', () => {
    const singleNameUser = toAuthUser(
      sampleUserWire({
        profile: {
          first_name: 'Aster',
          last_name: 'Aster',
          full_name: 'Aster Aster',
          avatar_url: null,
        },
      })
    );
    expect(singleNameUser.name).toBe('Aster');
  });

  it('derives name from email local part or phone when name is empty', () => {
    const fromEmail = toAuthUser(sampleUserWire({ name: null, email: 'dagm@test.com' }));
    expect(fromEmail.name).toBe('dagm');

    const fromPhone = toAuthUser(sampleUserWire({ name: '', email: null, phone: '+251911223344' }));
    expect(fromPhone.name).toBe('3344');

    const fallback = toAuthUser(sampleUserWire({ name: '', email: null, phone: null }));
    expect(fallback.name).toBe('Member');
  });
});

describe('authService.signIn', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it('posts credentials and returns mapped session', async () => {
    mockedApiFetch.mockResolvedValueOnce({ data: sampleSessionWire() } as any);
    const res = await authService.signIn({ identifier: '+251911123456', password: 'password123' });
    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { identifier: '+251911123456', password: 'password123' },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.access_token).toBe('acc-jwt-token');
      expect(res.user.name).toBe('Abebe Bikila');
    }
  });

  it('handles sign in error gracefully', async () => {
    mockedApiFetch.mockRejectedValueOnce(new Error('invalid_credentials'));
    const res = await authService.signIn({ identifier: 'wrong', password: 'wrong' });
    expect(res.ok).toBe(false);
  });
});

describe('authService.requestSignupOtp and verifySignupOtp', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it('requestSignupOtp posts phone to /auth/signup/request_otp', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      data: { challenge_id: 'ch-999', status: 'pending', expires_at: '2026-10-08T00:00:00Z' },
    } as any);

    const res = await authService.requestSignupOtp('+251911123456');
    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/signup/request_otp', {
      method: 'POST',
      body: { phone: '+251911123456' },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.challenge_id).toBe('ch-999');
      expect(res.status).toBe('pending');
    }
  });

  it('verifySignupOtp posts code to /phone_verifications/:id/verify and returns token', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      data: { verification_token: 'ver-token-abc', expires_at: '2026-10-08T00:15:00Z' },
    } as any);

    const res = await authService.verifySignupOtp('ch-999', '123456');
    expect(mockedApiFetch).toHaveBeenCalledWith('/phone_verifications/ch-999/verify', {
      method: 'POST',
      body: { code: '123456' },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.verification_token).toBe('ver-token-abc');
    }
  });
});

describe('authService.signUp', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it('posts user data with first_name, last_name, verification_token and returns established session', async () => {
    mockedApiFetch.mockResolvedValueOnce({ data: sampleSessionWire() } as any);

    const res = await authService.signUp({
      firstName: 'Abebe',
      lastName: 'Bikila',
      phone: '+251911123456',
      password: 'password123',
      passwordConfirmation: 'password123',
      verification_token: 'ver-token-abc',
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/signup', {
      method: 'POST',
      body: {
        user: {
          first_name: 'Abebe',
          last_name: 'Bikila',
          phone: '+251911123456',
          password: 'password123',
          password_confirmation: 'password123',
        },
        verification_token: 'ver-token-abc',
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.access_token).toBe('acc-jwt-token');
      expect(res.user.id).toBe('user-123');
    }
  });
});

describe('authService.me and updateProfile (G-14)', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it('me calls GET /user', async () => {
    mockedApiFetch.mockResolvedValueOnce({ data: sampleUserWire() } as any);
    const res = await authService.me();
    expect(mockedApiFetch).toHaveBeenCalledWith('/user');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.user.name).toBe('Abebe Bikila');
    }
  });

  it('updateProfile calls PATCH /user with profile payload', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      data: sampleUserWire({
        profile: {
          first_name: 'Haile',
          last_name: 'Gebrselassie',
          full_name: 'Haile Gebrselassie',
          avatar_url: null,
        },
      }),
    } as any);

    const res = await authService.updateProfile({
      first_name: 'Haile',
      last_name: 'Gebrselassie',
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('/user', {
      method: 'PATCH',
      body: {
        profile: {
          first_name: 'Haile',
          last_name: 'Gebrselassie',
        },
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.user.name).toBe('Haile Gebrselassie');
      expect(res.user.profile?.first_name).toBe('Haile');
    }
  });
});

describe('authService.removeAvatar (G-47)', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it('removeAvatar calls DELETE /user/avatar', async () => {
    mockedApiFetch.mockResolvedValueOnce({ data: sampleUserWire() } as any);
    const res = await authService.removeAvatar();
    expect(mockedApiFetch).toHaveBeenCalledWith('/user/avatar', {
      method: 'DELETE',
    });
    expect(res.ok).toBe(true);
  });
});


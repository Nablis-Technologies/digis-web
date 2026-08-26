export type AuthProvider = 'password' | 'google';

export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  provider: AuthProvider;
  photo?: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type AuthErrorResponse = { ok: false; error: string };
export type AuthSuccessResponse<T = Record<string, never>> = { ok: true; error?: undefined } & T;
export type AuthResult<T = Record<string, never>> = AuthSuccessResponse<T> | AuthErrorResponse;

export type CheckAccountRequest = { identifier: string };
export type CheckAccountResponse = AuthResult<{ exists: boolean; isEmail: boolean }>;

export type SignInRequest = { identifier: string; password: string };
export type SignInResponse = AuthResult<AuthSession>;

export type SignUpRequest = { name: string; phone: string; email?: string; password: string };
export type VerificationPurpose = 'signup' | 'password_reset';
export type PendingVerification = { verificationToken: string; identifier: string; purpose: VerificationPurpose };
export type SignUpResponse = AuthResult<{ verification: PendingVerification }>;

export type VerifyOtpRequest = { verificationToken: string; code: string };
export type VerifyOtpResponse = AuthResult<{ session?: AuthSession; passwordResetToken?: string }>;

export type ResendOtpRequest = { verificationToken: string };
export type ResendOtpResponse = AuthResult<{ verification: PendingVerification }>;

export type PasswordResetRequest = { identifier: string };
export type PasswordResetResponse = AuthResult<{ verification: PendingVerification }>;

export type SetNewPasswordRequest = { passwordResetToken: string; password: string };
export type SetNewPasswordResponse = AuthResult<AuthSession>;

export type UpdateProfileRequest = { token: string; updates: { name?: string; email?: string; phone?: string; photo?: string | null } };
export type UpdateProfileResponse = AuthResult<AuthSession>;

export type GoogleSignInRequest = Record<string, never>;
export type GoogleSignInResponse = AuthResult<{ session?: AuthSession; needsPhone: boolean; phoneCompletionToken?: string }>;

export type CompleteGooglePhoneRequest = { phoneCompletionToken: string; phone: string };
export type CompleteGooglePhoneResponse = AuthResult<AuthSession>;

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glass, glassControl, glassField } from '@/lib/ui/glass';

/**
 * Guest free-admission phone proof, shown inline as its own checkout step.
 *
 * The backend demands the OTP only for an unauthenticated buyer whose selection
 * prices to $0 (`Orders::AdmissionSelections::CheckoutDispatcher` →
 * `phone_verification_required`). A paid guest selection is not asked to prove
 * the phone: it declares `phone_confirmation: true`, and the backend binds the
 * Order to that phone with a signed order-access token (no provider check). The
 * code is requested via `admission_selections/request_otp` and traded for a
 * `verification_token` that the caller re-submits with the selection.
 */
export function PhoneOtpStep({
  phone,
  isDark,
  loading,
  error,
  onVerify,
  onResend,
}: {
  phone: string;
  isDark: boolean;
  loading: boolean;
  error?: string;
  onVerify: (code: string) => void;
  onResend: () => void;
}) {
  const [code, setCode] = useState('');
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const canSubmit = !loading && code.trim().length >= 4;

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl px-4 py-4"
        style={glass(isDark)}
      >
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
            style={glassControl(isDark, 'accent')}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: '#d6f905' }} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: textPrimary }}>
              Confirm your phone number
            </p>
            <p className="text-[11.5px] mt-0.5 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
              This ticket is free, so we need to confirm it&apos;s really you. Enter the code we sent to {phone}.
            </p>
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden" style={glassField(isDark)}>
        <GlassReflection isDark={isDark} edgeState={error ? 'error' : undefined} />
        <AppInput
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          inputMode="numeric"
          aria-label="Verification code"
          className="relative z-10 w-full h-14 px-4 text-[18px] tracking-[8px] text-center outline-none"
          style={{ color: isDark ? '#fff' : '#111' }}
        />
      </div>

      {error && (
        <p className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: '#f87171' }}>{error}</p>
      )}

      <AppButton
        onClick={() => onVerify(code.trim())}
        disabled={!canSubmit}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #d9ff00 0%, #d6f905 100%)', color: '#0a0a0a' }}
      >
        <span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
          {loading ? 'Verifying…' : 'Verify & continue'}
        </span>
      </AppButton>

      <div className="text-center">
        <button
          type="button"
          onClick={onResend}
          disabled={loading}
          className="text-[12px] cursor-pointer disabled:opacity-50"
          style={{ fontFamily: "'Inter', sans-serif", color: textMuted, background: 'none', border: 'none' }}
        >
          Didn&apos;t get it? Send a new code
        </button>
      </div>
    </div>
  );
}

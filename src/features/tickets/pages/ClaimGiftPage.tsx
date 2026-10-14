import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Gift,
  Check,
  Calendar,
  AlertTriangle,
  QrCode,
  ArrowRight,
  Sparkles,
  Ticket,
  HeartHandshake,
} from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { giftService, type ResolvedGiftView } from '@/lib/gifts';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glass, glassControl, glassField } from '@/lib/ui/glass';
import { primaryButtonSurface } from '@/lib/ui/disabledStyles';
import { isoToDisplayDate } from '@/lib/mappers';
import { ApiError } from '@/lib/errors';

function giftErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'gift_invalid':
        return 'This gift link is invalid or has expired.';
      case 'gift_not_ready':
        return 'This gift order is still awaiting payment confirmation.';
      case 'idempotency_conflict':
        return 'This claim is already being processed. Please refresh.';
      case 'gift_expired':
        return 'This gift ticket has expired.';
      case 'gift_revoked':
        return 'This gift purchase was refunded or cancelled by the purchaser.';
      case 'gift_quantity_invalid':
        return 'Gift tickets must be sent 1 per recipient.';
      case 'recipient_phone_invalid':
        return 'Please enter a valid recipient phone number.';
      case 'gift_recipient_same_as_purchaser':
        return 'You cannot send a gift ticket to your own phone number.';
      default:
        return err.message || fallback;
    }
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

interface ClaimGiftPageProps {
  id: string;
  token: string;
  onRequestAuth?: () => void;
  onNavigateHome: () => void;
  onNavigateTickets: () => void;
}

export function ClaimGiftPage({
  id,
  token,
  onRequestAuth,
  onNavigateHome,
  onNavigateTickets,
}: ClaimGiftPageProps) {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,46,0.6)';
  const textDim = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,26,46,0.45)';
  const accent = isDark ? '#d6f905' : '#0a0a0a';

  const {
    data: giftView,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['gift', id, token],
    queryFn: () => giftService.resolveGift(id, token),
    enabled: Boolean(id && token),
    retry: false,
    staleTime: 60_000,
  });

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [acceptedConsents, setAcceptedConsents] = useState<Record<string, boolean>>({});
  const [claimError, setClaimError] = useState<string>('');
  const [claimedView, setClaimedView] = useState<ResolvedGiftView | null>(null);

  const claimMutation = useMutation({
    mutationFn: async () => {
      setClaimError('');
      const questionAnswers = Object.entries(answers).map(([question_key, value]) => ({
        question_key,
        value,
      }));
      const consentList = Object.entries(acceptedConsents)
        .filter(([, accepted]) => accepted)
        .map(([consent_document_version_id]) => {
          const doc = giftView?.consents?.find((c) => c.id === consent_document_version_id);
          return {
            consent_document_version_id,
            content_sha256: doc?.content_sha256 ?? '',
          };
        });

      return giftService.claimGift(id, {
        token,
        answers: questionAnswers,
        consents: consentList,
      });
    },
    onSuccess: (data) => {
      setClaimedView(data);
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {
        // Confetti fallback
      }
    },
    onError: (err: any) => {
      setClaimError(giftErrorMessage(err, 'Failed to claim gift. Please try again.'));
    },
  });

  const currentView = claimedView || giftView;
  const isClaimed = currentView?.gift?.status === 'claimed' || Boolean(currentView?.ticket);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div
          className="relative overflow-hidden rounded-3xl p-8 max-w-md w-full text-center space-y-4"
          style={glass(isDark)}
        >
          <GlassReflection isDark={isDark} />
          <div className="w-16 h-16 mx-auto rounded-2xl animate-pulse" style={glassControl(isDark, 'accent')} />
          <div className="h-5 w-48 mx-auto rounded-lg animate-pulse" style={glassControl(isDark)} />
          <div className="h-4 w-32 mx-auto rounded-lg animate-pulse" style={glassControl(isDark)} />
        </div>
      </div>
    );
  }

  if (isError || !giftView) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div
          className="relative overflow-hidden rounded-3xl p-8 max-w-md w-full text-center space-y-4"
          style={glass(isDark)}
        >
          <GlassReflection isDark={isDark} />
          <div className="w-14 h-14 mx-auto rounded-2xl grid place-items-center" style={glassControl(isDark, 'danger')}>
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-[20px] font-medium" style={{ color: textPrimary, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
            Gift Unavailable
          </h2>
          <p className="text-[13px] leading-relaxed" style={{ color: textMuted }}>
            {giftErrorMessage(error, 'This gift link is invalid or has expired.')}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <AppButton
              onClick={onNavigateHome}
              className="px-6 py-3 rounded-2xl text-[13px] font-semibold cursor-pointer"
              style={{ background: accent, color: isDark ? '#000' : '#fff' }}
            >
              Browse Events
            </AppButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-lg w-full space-y-6">
        {/* Header Kicker */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase" style={glassControl(isDark, 'accent')}>
            <Sparkles className="w-3.5 h-3.5 text-lime-400" />
            <span style={{ color: textPrimary }}>Ticket Gift</span>
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-light tracking-tight" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
            {isClaimed ? 'Your Ticket is Ready' : 'You Received a Gift!'}
          </h1>
          <p className="text-[13px]" style={{ color: textMuted }}>
            {isClaimed ? 'This ticket is safely registered in your name.' : 'Claim your ticket below to attend the event.'}
          </p>
        </div>

        {/* Gift Card */}
        <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-8 space-y-6" style={glass(isDark)}>
          <GlassReflection isDark={isDark} />

          {/* Event & Product Details */}
          <div className="space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: isDark ? '#d6f905' : '#1a1a1a' }}>
              {currentView.event.title}
            </span>
            <h3 className="text-[22px] font-medium leading-tight" style={{ color: textPrimary, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
              {currentView.product.name}
            </h3>
            {currentView.product.description && (
              <p className="text-[13px] leading-relaxed" style={{ color: textMuted }}>
                {currentView.product.description}
              </p>
            )}
          </div>

          {/* Personal Note */}
          {currentView.gift.note && (
            <div
              className="relative overflow-hidden rounded-2xl p-4 flex items-start gap-3"
              style={{
                background: isDark ? 'rgba(214, 249, 5, 0.06)' : 'rgba(214, 249, 5, 0.12)',
                border: isDark ? '1px solid rgba(214, 249, 5, 0.2)' : '1px solid rgba(214, 249, 5, 0.3)',
              }}
            >
              <HeartHandshake className="w-5 h-5 shrink-0 mt-0.5" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} />
              <div className="space-y-0.5 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }}>
                  Personal Note
                </p>
                <p className="text-[13px] italic leading-relaxed" style={{ color: textPrimary }}>
                  &ldquo;{currentView.gift.note}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Claimed View: Ticket Info */}
          {isClaimed && currentView.ticket && (
            <div className="relative overflow-hidden rounded-2xl p-5 space-y-4 text-center" style={glassControl(isDark, 'accent')}>
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center">
                <Check className="w-7 h-7" strokeWidth={3} />
              </div>
              <div className="space-y-1">
                <p className="text-[15px] font-semibold" style={{ color: textPrimary }}>
                  Claim Complete
                </p>
                {currentView.ticket.lookup_code && (
                  <p className="font-mono text-[14px] font-bold tracking-widest" style={{ color: accent }}>
                    Code: {currentView.ticket.lookup_code}
                  </p>
                )}
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <AppButton
                  onClick={onNavigateTickets}
                  className="w-full py-3.5 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: accent, color: isDark ? '#000' : '#fff' }}
                >
                  <Ticket className="w-4 h-4" />
                  <span>View in My Tickets</span>
                </AppButton>
              </div>
            </div>
          )}

          {/* Unclaimed View: Action & Consents */}
          {!isClaimed && (
            <div className="space-y-4 pt-2">
              {/* Optional Consents */}
              {giftView.consents && giftView.consents.length > 0 && (
                <div className="space-y-2">
                  {giftView.consents.map((consent) => (
                    <label key={consent.id} className="flex items-start gap-2.5 cursor-pointer text-[12px]" style={{ color: textMuted }}>
                      <input
                        type="checkbox"
                        checked={Boolean(acceptedConsents[consent.id])}
                        onChange={(e) =>
                          setAcceptedConsents((prev) => ({ ...prev, [consent.id]: e.target.checked }))
                        }
                        className="mt-0.5 rounded"
                      />
                      <span>I agree to {consent.title}</span>
                    </label>
                  ))}
                </div>
              )}

              {claimError && (
                <p className="text-[12px] text-red-400 font-medium text-center">
                  {claimError}
                </p>
              )}

              <AppButton
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending}
                className="w-full py-4 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                style={{
                  ...primaryButtonSurface(!claimMutation.isPending, isDark),
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {claimMutation.isPending ? (
                  <span>Claiming ticket…</span>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    <span>Claim Ticket Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </AppButton>

              <p className="text-[11px] text-center" style={{ color: textDim }}>
                Expires {isoToDisplayDate(currentView.gift.expires_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

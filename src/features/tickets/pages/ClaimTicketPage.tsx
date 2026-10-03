import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import { ArrowRight, ArrowLeft, AlertTriangle, LogIn, Phone, ShieldCheck, Check } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { transferService } from '@/lib/transfer';
import { ticketKeys } from '@/lib/tickets';
import { mapApiError } from '@/lib/errors';
import { DetailedTicket } from '@/features/tickets/components/DetailedTicket';
import { DownloadableTicketCard } from '@/features/tickets/components/DownloadableTicketCard';
import type { AcceptedTransfer } from '@/lib/transfer';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassControl, glassEdge, glassField } from '@/lib/ui/glass';
import { toastError } from '@/lib/feedback';

const ACCENT_HEX = '#d6f905';

interface ClaimTicketPageProps {
  id: string;
  token: string;
  onRequestAuth: () => void;
  onNavigateHome: () => void;
  onNavigateTickets: () => void;
}

type Step = 'phone' | 'claim' | 'done';

export function ClaimTicketPage({ id, token, onRequestAuth, onNavigateHome, onNavigateTickets }: ClaimTicketPageProps) {
  const { isDark } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transfer, isLoading, isError } = useQuery({
    queryKey: ['transfer', id],
    queryFn: () => transferService.fetchPublic(id, token),
    enabled: Boolean(id && token),
    retry: false,
    staleTime: 60_000,
  });

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState<AcceptedTransfer | null>(null);
  // A signed-in recipient accepts with one tap (authenticated accept, no OTP);
  // guests prove the phone with an OTP. "Not your account?" falls back to guest.
  const [mode, setMode] = useState<'auth' | 'guest'>(isAuthenticated ? 'auth' : 'guest');
  const [accepting, setAccepting] = useState(false);
  // Signing in on this page switches to the one-tap accept â€” unless the visitor
  // deliberately chose to claim with a different (recipient) phone.
  const choseGuestRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !choseGuestRef.current) setMode('auth');
  }, [isAuthenticated]);

  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  const handleSendCode = useCallback(async () => {
    if (!transfer) return;
    setSending(true);
    setError('');
    try {
      const result = await transferService.requestOtp(id, token, phone.trim());
      setChallengeId(result.challengeId);
      setStep('claim');
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setSending(false);
    }
  }, [transfer, id, token, phone]);

  const handleClaim = useCallback(async () => {
    if (!transfer) return;
    setClaiming(true);
    setError('');
    try {
      const { verificationToken } = await transferService.verifyOtp(challengeId, code.trim());
      const result = await transferService.accept({
        id,
        token,
        phone: phone.trim(),
        verificationToken,
        password: password || undefined,
        passwordConfirmation: passwordConfirm || undefined,
      });
      setAccepted(result);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
      window.setTimeout(() => {
        const origin = { x: 0.5, y: 0.38 };
        confetti({ particleCount: 100, spread: 72, startVelocity: 38, origin, zIndex: 100, colors: ['#d6f905', '#f4f4f0', '#aabbd0', '#ba8b9a'] });
        confetti({ particleCount: 55, spread: 110, startVelocity: 28, scalar: 0.78, origin, zIndex: 100, colors: ['#d6f905', '#f4f4f0', '#aabbd0', '#ba8b9a'] });
      }, 250);
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setClaiming(false);
    }
  }, [transfer, challengeId, code, password, passwordConfirm, id, token, phone, queryClient]);

  // Signed-in recipient: one-tap authenticated accept (no OTP, no password).
  const handleAcceptAuthed = useCallback(async () => {
    setAccepting(true);
    setError('');
    try {
      await transferService.acceptAuthenticated(id, token);
      queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
      onNavigateTickets();
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setAccepting(false);
    }
  }, [id, token, queryClient, onNavigateTickets]);

  const handleDownload = useCallback(async () => {
    if (!downloadRef.current) return;
    setDownloading(true);
    setDownloadDone(false);
    try {
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(downloadRef.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${(accepted?.ticket.eventName ?? 'ticket').replace(/\s+/g, '_')}_ticket.png`;
      link.click();
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 2500);
    } catch (err) {
      toastError(err, 'Couldnâ€™t save your ticket image. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [accepted]);

  const surfaceSoft = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  const text = isDark ? '#ffffff' : '#0a0a0a';
  const textDim = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const textFaint = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';
  const placeholderClass = isDark ? 'placeholder-white/30' : 'placeholder-black/30';

  const backButton = (
    <AppButton
      onClick={onNavigateHome}
      className="fixed top-6 left-6 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center z-[30]"
      style={{ background: surfaceSoft }}
      aria-label="Back to Digis"
    >
      <GlassReflection isDark={isDark} />
      <span className="relative z-10 flex items-center justify-center">
        <ArrowLeft className="w-4 h-4" style={{ color: textDim }} strokeWidth={1.8} />
      </span>
    </AppButton>
  );

  // Loading / invalid link
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
        {backButton}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md rounded-[28px] overflow-hidden p-8 text-center" style={{ background: isDark ? '#0f0f10' : '#ffffff' }}>
          <GlassReflection isDark={isDark} />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <motion.div className="w-8 h-8 rounded-full" style={{ border: '2px solid rgba(214,249,5,0.2)', borderTopColor: ACCENT_HEX }} animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
            <p className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Opening your ticketâ€¦</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isError || !transfer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
        {backButton}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md rounded-[28px] overflow-hidden p-8 text-center" style={{ background: isDark ? '#0f0f10' : '#ffffff' }}>
          <GlassReflection isDark={isDark} />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5" style={glassControl(isDark, 'danger')}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#ef4444' }} strokeWidth={1.8} />
            </div>
            <h1 className="text-[22px] font-light tracking-[-0.3px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>
              Link not found
            </h1>
            <p className="mt-2 text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
              This transfer link is invalid or has expired. Ask the sender to share a new one.
            </p>
            <AppButton onClick={onNavigateHome} className="mt-6 px-6 py-3 rounded-full inline-flex items-center gap-2" style={{ background: ACCENT_HEX, color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13 }}>
              Browse events
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
            </AppButton>
          </div>
        </motion.div>
      </div>
    );
  }

  if (transfer.status !== 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
        {backButton}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md rounded-[28px] overflow-hidden p-8 text-center" style={{ background: isDark ? '#0f0f10' : '#ffffff' }}>
          <GlassReflection isDark={isDark} />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5" style={glassControl(isDark, 'accent')}>
              <ShieldCheck className="w-6 h-6" style={{ color: isDark ? ACCENT_HEX : '#0a0a0a' }} strokeWidth={1.8} />
            </div>
            <h1 className="text-[22px] font-light tracking-[-0.3px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>
              {transfer.status === 'accepted' ? 'Ticket already claimed' : transfer.status === 'expired' ? 'This transfer has expired' : 'This transfer is closed'}
            </h1>
            <p className="mt-2 text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
              {transfer.status === 'accepted' ? 'This ticket has already been claimed by its recipient.' : 'The sender can start a new transfer if they still want to share the ticket.'}
            </p>
            <AppButton onClick={onNavigateHome} className="mt-6 px-6 py-3 rounded-full inline-flex items-center gap-2" style={{ background: ACCENT_HEX, color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13 }}>
              Browse events
              <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
            </AppButton>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success â€” show the claimed ticket.
  if (step === 'done' && accepted) {
    const footer = isAuthenticated ? (
      <AppButton onClick={onNavigateTickets} className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer" style={{ background: ACCENT_HEX, color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5 }}>
        View in my tickets
        <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
      </AppButton>
    ) : (
      <div className="space-y-2.5">
        <AppButton onClick={onRequestAuth} className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer" style={{ background: surfaceSoft, ...glassEdge(isDark), color: text, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5 }}>
          <LogIn className="w-4 h-4" strokeWidth={2} />
          Sign in with your phone
        </AppButton>
        <p className="text-[11px] text-center" style={{ fontFamily: "'Inter', sans-serif", color: textFaint }}>
          Your account is created â€” sign in to keep this ticket on all your devices.
        </p>
      </div>
    );

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
        {backButton}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="w-full max-w-md">
          <DetailedTicket ticket={accepted.ticket} onClose={onNavigateHome} onDownload={handleDownload} downloading={downloading} downloadDone={downloadDone} footer={footer} />
        </motion.div>
        <div style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none', opacity: 0 }} aria-hidden>
          <DownloadableTicketCard ref={downloadRef} ticket={accepted.ticket} />
        </div>
      </div>
    );
  }

  // Pending â€” phone + OTP claim.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16">
      {backButton}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative w-full overflow-hidden rounded-[28px]" style={{ background: isDark ? '#0f0f10' : '#ffffff' }}>
          <GlassReflection isDark={isDark} />
          <div className="relative z-10">
            <div className="relative h-40" style={{ background: `linear-gradient(135deg, rgba(214,249,5,0.16), rgba(214,249,5,0.02))` }}>
              {transfer.image && <img src={transfer.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
              <div className="absolute inset-0" style={{ background: isDark ? 'linear-gradient(to top, #0f0f10 5%, rgba(15,15,16,0.1))' : 'linear-gradient(to top, #ffffff 8%, rgba(255,255,255,0.15))' }} />
              <p className="absolute top-4 left-5 text-[10px] tracking-[2px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textFaint, fontWeight: 600 }}>
                Ticket transfer
              </p>
            </div>
            <div className="px-6 pb-6">
              <h1 className="text-[24px] font-light tracking-[-0.3px]" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}>
                {transfer.event.title}
              </h1>
              <p className="mt-1 text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                {transfer.ticket.product.name} Â· {transfer.ticket.status}
              </p>
              {mode !== 'auth' && (
              <div className="relative mt-4 rounded-2xl overflow-hidden px-4 py-3 flex items-center gap-3" style={{ background: surfaceSoft }}>
                <GlassReflection isDark={isDark} />
                <Phone className="relative z-10 w-4 h-4 flex-shrink-0" style={{ color: textDim }} strokeWidth={1.8} />
                <p className="relative z-10 text-[12.5px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                  A code will be sent to <span style={{ color: text, fontWeight: 500 }}>{transfer.recipient.phone}</span>
                </p>
              </div>
              )}

              {mode === 'auth' ? (
                <>
                  <p className="mt-4 text-[12.5px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                    You&apos;re signed in{user?.phone ? <> as <span style={{ color: text, fontWeight: 500 }}>{user.phone}</span></> : ''}. Accept this ticket to add it to your account.
                  </p>
                  <AppButton
                    onClick={handleAcceptAuthed}
                    disabled={accepting}
                    className="mt-4 w-full py-3.5 rounded-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    style={{ background: ACCENT_HEX, color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5 }}
                  >
                    {accepting ? (
                      <motion.div className="w-4 h-4 rounded-full" style={{ border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#0a0a0a' }} animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
                    ) : (
                      <>
                        Accept ticket
                        <Check className="w-4 h-4" strokeWidth={2.4} />
                      </>
                    )}
                  </AppButton>
                  <button
                    onClick={() => { choseGuestRef.current = true; setMode('guest'); setError(''); }}
                    className="mt-3 w-full text-center text-[11.5px] cursor-pointer"
                    style={{ fontFamily: "'Inter', sans-serif", color: textDim }}
                  >
                    Not your account? Claim with the recipient&apos;s phone
                  </button>
                </>
              ) : step === 'phone' ? (
                <>
                  {!isAuthenticated && (
                    <>
                      <AppButton
                        onClick={onRequestAuth}
                        className="mt-4 w-full py-3.5 rounded-full flex items-center justify-center gap-2 cursor-pointer"
                        style={{ background: ACCENT_HEX, color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5 }}
                      >
                        <LogIn className="w-4 h-4" strokeWidth={2.2} />
                        Sign in to accept
                      </AppButton>
                      <p className="mt-3 text-[11px] text-center" style={{ fontFamily: "'Inter', sans-serif", color: textFaint }}>
                        Or verify the recipient phone to claim as a guest.
                      </p>
                    </>
                  )}
                  <p className="mt-4 text-[12.5px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                    Enter your full phone number to verify ownership and receive the code.
                  </p>
                  <div className="relative mt-3 rounded-2xl overflow-hidden" style={glassField(isDark)}>
                    <GlassReflection isDark={isDark} />
                    <AppInput
                      type="tel"
                      placeholder="+251 9·· ·· ·· ··"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="relative z-10 w-full px-4 py-3.5 outline-none text-[14px]"
                      style={{ color: text, fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                  <AppButton
                    onClick={handleSendCode}
                    disabled={!phone.trim() || sending}
                    className="mt-4 w-full py-3.5 rounded-full flex items-center justify-center gap-2 cursor-pointer"
                    style={{ background: ACCENT_HEX, color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5 }}
                  >
                    {sending ? (
                      <motion.div className="w-4 h-4 rounded-full" style={{ border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#0a0a0a' }} animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
                    ) : (
                      <>
                        Send code
                        <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                      </>
                    )}
                  </AppButton>
                </>
              ) : (
                <>
                  <p className="mt-4 text-[12.5px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                    Enter the code we texted you and create your account.
                  </p>
                  <div className="relative mt-3 rounded-2xl overflow-hidden" style={glassField(isDark)}>
                    <GlassReflection isDark={isDark} />
                    <AppInput
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Code ••••••"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="relative z-10 w-full px-4 py-3.5 outline-none text-center text-[20px] tracking-[8px]"
                      style={{ color: text, fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                  <div className="relative mt-3 rounded-2xl overflow-hidden" style={glassField(isDark)}>
                    <GlassReflection isDark={isDark} />
                    <AppInput
                      type="password"
                      autoComplete="new-password"
                      placeholder="Password (at least 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="relative z-10 w-full px-4 py-3.5 outline-none text-[14px]"
                      style={{ color: text, fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                  <div className="relative mt-3 rounded-2xl overflow-hidden" style={glassField(isDark)}>
                    <GlassReflection isDark={isDark} />
                    <AppInput
                      type="password"
                      autoComplete="new-password"
                      placeholder="Confirm password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="relative z-10 w-full px-4 py-3.5 outline-none text-[14px]"
                      style={{ color: text, fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                  <AppButton
                    onClick={handleClaim}
                    disabled={code.trim().length !== 6 || password.length < 8 || password !== passwordConfirm || claiming}
                    className="mt-4 w-full py-3.5 rounded-full flex items-center justify-center gap-2 cursor-pointer"
                    style={{ background: ACCENT_HEX, color: '#0a0a0a', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5 }}
                  >
                    {claiming ? (
                      <motion.div className="w-4 h-4 rounded-full" style={{ border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#0a0a0a' }} animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
                    ) : (
                      <>
                        Claim & create account
                        <Check className="w-4 h-4" strokeWidth={2.4} />
                      </>
                    )}
                  </AppButton>
                  <button
                    onClick={() => setStep('phone')}
                    className="mt-3 w-full text-center text-[11.5px] cursor-pointer"
                    style={{ fontFamily: "'Inter', sans-serif", color: textDim }}
                  >
                    Use a different number
                  </button>
                  {password && passwordConfirm && password !== passwordConfirm && (
                    <p className="mt-2 text-[11px] text-center" style={{ fontFamily: "'Inter', sans-serif", color: '#ef4444' }}>
                      Passwords do not match
                    </p>
                  )}
                </>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl px-3.5 py-3" style={{ ...glassControl(isDark, 'danger') }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} strokeWidth={2} />
                  <p className="text-[12px] leading-snug" style={{ fontFamily: "'Inter', sans-serif", color: '#ef4444' }}>
                    {error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Gift,
  ArrowRight,
  ArrowLeft,
  X,
  User,
  Phone,
  ShieldCheck,
  Check,
  AlertTriangle,
  Link2,
  Copy,
  Bell,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/app/components/ThemeContext';
import { Money } from '@/lib/money';
import { Field, Row, TicketPreview } from '@/features/tickets/components/TransferTicketParts';
import { disabledSurface } from '@/lib/ui/disabledStyles';
import { copyText } from '@/lib/utils/clipboard';
import { AppButton } from '@/components/primitives/AppButton';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { mapApiError } from '@/lib/errors';

interface TransferTicketProps {
  ticket: {
    id?: string;
    eventName: string;
    eventDate: string;
    eventTime?: string;
    venue: string;
    ticketType: string;
    image?: string;
  };
  onClose: () => void;
  /** Uses the same in-dialog delivery flow with gift-specific language. */
  mode?: 'transfer' | 'gift';
  /** Optional extras can be included only when gifting. */
  giftExtras?: { id: string; name: string; description: string; priceMinor: number }[];
  onTransfer: (payload: { ticketId?: string; recipientName: string; contactMethod: ContactMethod; contactValue: string; note: string; extraIds?: string[] }) => Promise<TransferOutcome | void> | TransferOutcome | void;
}

interface TransferOutcome {
  /** Shareable deep link to send over email / SMS. */
  shareLink?: string;
  /** Whether the recipient already has a Digis account (they get a notification). */
  recipientHasAccount?: boolean;
}

type ContactMethod = 'phone' | 'email';

const ACCENT = '214,249,5';
const ACCENT_HEX = '#d6f905';

function isValidContact(method: ContactMethod, value: string) {
  const v = value.trim();
  if (!v) return false;
  if (method === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  return /^[+\d][\d\s()-]{6,}$/.test(v);
}

export function TransferTicket({ ticket, onClose, onTransfer, mode = 'transfer', giftExtras = [] }: TransferTicketProps) {
  const isGift = mode === 'gift';
  const FlowIcon = isGift ? Gift : Send;
  const { isDark } = useTheme();
  const [step, setStep] = useState(0); // 0=recipient, 1=note, 2=review, 3=sent
  const [recipientName, setRecipientName] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [note, setNote] = useState('');
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [recipientHasAccount, setRecipientHasAccount] = useState(false);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => nameRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Theme tokens
  const surface = isDark ? '#0f0f10' : '#ffffff';
  const surfaceSoft = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const surfaceHover = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const borderSoft = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const text = isDark ? '#ffffff' : '#0a0a0a';
  const textDim = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const textFaint = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';
  const placeholderClass = isDark ? 'placeholder-white/30' : 'placeholder-black/30';
  const accentSoft = `rgba(${ACCENT},0.12)`;
  const accentBorder = `rgba(${ACCENT},0.3)`;
  const accentText = isDark ? ACCENT_HEX : '#0a0a0a';

  const selectedExtras = giftExtras.filter((extra) => selectedExtraIds.includes(extra.id));

  const recipientValid =
    recipientName.trim().length > 0 && isValidContact('phone', contactValue);
  const canProceed = step === 0 ? recipientValid : step === 2 ? acknowledged : true;

  const handleSend = () => {
    setSending(true);
    setSendError('');
    let failed = false;
    setTimeout(() => {
      Promise.resolve(onTransfer({
        ticketId: ticket.id,
        recipientName: recipientName.trim(),
        contactMethod: 'phone',
        contactValue: contactValue.trim(),
        note: note.trim(),
        extraIds: isGift ? selectedExtraIds : undefined,
      }))
        .then((outcome) => {
          if (outcome && typeof outcome === 'object') {
            if (outcome.shareLink) setShareLink(outcome.shareLink);
            setRecipientHasAccount(Boolean(outcome.recipientHasAccount));
          }
        })
        .catch((err) => {
          failed = true;
          console.error(`Failed to ${isGift ? 'send gift' : 'transfer ticket'}:`, err);
          setSendError(mapApiError(err));
        })
        .finally(() => {
          setSending(false);
          if (!failed) setStep(3);
        });
    }, 1400);
  };

  const handleCopy = () => {
    if (!shareLink) return;
    copyText(shareLink).then((didCopy) => { if (didCopy) { setCopied(true); setTimeout(() => setCopied(false), 2000); } });
  };

  const stepTitle =
    step === 0 ? 'Choose who receives it' : step === 1 ? (isGift ? 'Add a gift note' : 'Add a note') : step === 2 ? (isGift ? 'Review gift delivery' : 'Review delivery') : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={step < 3 ? onClose : undefined}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{
          background: isDark ? 'rgba(4,4,6,0.78)' : 'rgba(20,20,30,0.5)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md mx-0 sm:mx-4 overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
        style={{
          background: surface,
          maxHeight: '92vh',
        }}
      >
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 contents">
        {/* Header */}
        <div className="relative px-6 pt-5 pb-3">
          <div className="flex items-center justify-between">
            {step > 0 && step < 3 ? (
              <AppButton
                whileTap={{ scale: 0.92 }}
                onClick={() => setStep(step - 1)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: surfaceSoft, border: `1px solid ${border}` }}
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" style={{ color: textDim }} strokeWidth={1.8} />
              </AppButton>
            ) : step < 3 ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: accentSoft, border: `1px solid ${accentBorder}` }}
                >
                  <FlowIcon className="w-3.5 h-3.5" style={{ color: accentText }} strokeWidth={2} />
                </div>
                <span
                  className="text-[10px] tracking-[2px] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", color: textDim, fontWeight: 600 }}
                >
                  {isGift ? 'Gift ticket' : 'Transfer'}
                </span>
              </div>
            ) : (
              <div />
            )}

            {step < 3 && (
              <AppButton
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: surfaceSoft, border: `1px solid ${border}` }}
                aria-label="Close"
              >
                <X className="w-4 h-4" style={{ color: textDim }} strokeWidth={1.8} />
              </AppButton>
            )}
          </div>

          {step < 3 && (
            <>
              <div className="flex items-center gap-1.5 mt-5">
                {[0, 1, 2].map((s) => (
                  <motion.div
                    key={s}
                    className="h-[3px] rounded-full flex-1"
                    animate={{
                      background: s <= step ? `rgba(${ACCENT},0.85)` : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    }}
                    transition={{ duration: 0.35 }}
                  />
                ))}
              </div>

              <motion.h2
                key={step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-[22px] font-light tracking-[-0.3px]"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}
              >
                {stepTitle}
              </motion.h2>
              <p className="mt-1 text-[12.5px]" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                {step === 0 ? 'A secure claim link lets them access the ticket without an account.' : step === 1 ? (isGift ? 'Add a short message to make this delivery feel personal.' : 'A note is optional — the ticket itself stays clean and ready to claim.') : (isGift ? 'Once sent, the gift claim link is ready for them. This can’t be undone.' : 'Once sent, the ticket leaves your wallet. This can’t be undone.')}
              </p>
            </>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-2 overflow-y-auto" style={{ maxHeight: '62vh' }}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="mt-3 space-y-3"
              >
                {/* Name */}
                <Field
                  icon={<User className="w-4 h-4" strokeWidth={1.8} />}
                  isDark={isDark}
                  active={recipientName.length > 0}
                >
                  <AppInput
                    ref={nameRef}
                    type="text"
                    placeholder="Recipient's full name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className={`w-full bg-transparent outline-none text-[14px] ${placeholderClass}`}
                    style={{ fontFamily: "'Inter', sans-serif", color: text }}
                  />
                </Field>

                {/* Recipient phone — transfers are bound to a verified phone number */}
                <Field
                  icon={<Phone className="w-4 h-4" strokeWidth={1.8} />}
                  isDark={isDark}
                  active={contactValue.length > 0}
                >
                  <AppInput
                    type="tel"
                    placeholder="+251 9·· ·· ·· ··"
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    className={`w-full bg-transparent outline-none text-[14px] ${placeholderClass}`}
                    style={{ fontFamily: "'Inter', sans-serif", color: text }}
                  />
                </Field>
                <p className="px-1 text-[10.5px]" style={{ fontFamily: "'Inter', sans-serif", color: textFaint }}>
                  They verify with a code sent to this number — the ticket is handed over only after that.
                </p>

                {/* Mini ticket preview */}
                <TicketPreview ticket={ticket} isDark={isDark} compact />
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="note" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="mt-3 space-y-4">
                <div className="rounded-2xl p-3.5" style={{ background: accentSoft, border: `1px solid ${accentBorder}` }}>
                  <p className="text-[12px] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>Add a short personal note if you’d like. It will travel with the secure claim link.</p>
                </div>
                <div className="relative">
                  <AppTextArea placeholder="Write something thoughtful…" value={note} onChange={(e) => setNote(e.target.value.slice(0, 140))} rows={2} className={`w-full px-4 py-3 rounded-2xl text-[13.5px] outline-none resize-none ${placeholderClass}`} style={{ background: surfaceSoft, border: `1px solid ${note ? accentBorder : borderSoft}`, color: text, fontFamily: "'Inter', sans-serif" }} />
                  <span className="absolute bottom-2.5 right-3 text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: textFaint }}>{note.length}/140</span>
                </div>
                {isGift && giftExtras.length > 0 && (
                  <div className="space-y-2">
                    <p className="px-1 text-[10px] tracking-[1.3px] uppercase" style={{ fontFamily: "'Inter', sans-serif", color: textFaint, fontWeight: 600 }}>Include extras</p>
                    <div className="space-y-2">
                      {giftExtras.map((extra) => {
                        const selected = selectedExtraIds.includes(extra.id);
                        return (
                          <AppButton key={extra.id} onClick={() => setSelectedExtraIds((ids) => selected ? ids.filter((id) => id !== extra.id) : [...ids, extra.id])} className="w-full rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left" style={{ background: selected ? accentSoft : surfaceSoft, border: `1px solid ${selected ? accentBorder : borderSoft}` }}>
                            <span className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: selected ? ACCENT_HEX : 'transparent', border: `1px solid ${selected ? ACCENT_HEX : border}` }}>{selected && <Check className="w-3 h-3" style={{ color: '#0a0a0a' }} strokeWidth={3} />}</span>
                            <span className="min-w-0 flex-1"><span className="block text-[12.5px]" style={{ fontFamily: "'Inter', sans-serif", color: text, fontWeight: 600 }}>{extra.name}</span><span className="block mt-0.5 text-[11px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>{extra.description}</span></span>
                            <span className="text-[12px] flex-shrink-0" style={{ fontFamily: "'Inter', sans-serif", color: text }}>ETB {Money.fromMinor(extra.priceMinor, "ETB").formatNumber()}</span>
                          </AppButton>
                        );
                      })}
                    </div>
                  </div>
                )}
                <TicketPreview ticket={ticket} isDark={isDark} compact />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="mt-3 space-y-4"
              >
                {/* From → To */}
                <div
                  className="relative rounded-2xl overflow-hidden p-4"
                  style={{ background: surfaceSoft }}
                >
                  <GlassReflection isDark={isDark} />
                  <div className="relative z-10">
                  <Row label="To" isDark={isDark}>
                    <div>
                      <p
                        className="text-[15px]"
                        style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text, fontWeight: 300 }}
                      >
                        {recipientName}
                      </p>
                      <p
                        className="text-[12px] mt-0.5"
                        style={{ fontFamily: "'Inter', sans-serif", color: textDim }}
                      >
                        {contactValue}
                      </p>
                    </div>
                  </Row>

                  {note && (
                    <>
                      <div className="h-px my-3" style={{ background: borderSoft }} />
                      <Row label="Note" isDark={isDark}>
                        <p
                          className="text-[13px] leading-relaxed"
                          style={{ fontFamily: "'Inter', sans-serif", color: text }}
                        >
                          {note}
                        </p>
                      </Row>
                    </>
                  )}
                  </div>
                </div>

                {isGift && selectedExtras.length > 0 && (
                  <div className="relative rounded-2xl overflow-hidden px-4 py-3" style={{ background: surfaceSoft }}>
                    <GlassReflection isDark={isDark} />
                    <div className="relative z-10">
                    <p className="text-[10px] tracking-[1.3px] uppercase mb-2" style={{ fontFamily: "'Inter', sans-serif", color: textFaint, fontWeight: 600 }}>Gift extras</p>
                    <p className="text-[12.5px]" style={{ fontFamily: "'Inter', sans-serif", color: text }}>{selectedExtras.map((extra) => extra.name).join(' · ')}</p>
                    </div>
                  </div>
                )}

                {/* Ticket card */}
                <TicketPreview ticket={ticket} isDark={isDark} />

                {/* Acknowledgement */}
                <AppButton
                  onClick={() => setAcknowledged((v) => !v)}
                  className="w-full flex items-start gap-3 rounded-2xl p-3.5 text-left"
                  style={{
                    background: acknowledged ? accentSoft : surfaceSoft,
                    border: `1px solid ${acknowledged ? accentBorder : borderSoft}`,
                    transition: 'all 0.25s',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: acknowledged ? ACCENT_HEX : 'transparent',
                      border: `1.5px solid ${acknowledged ? ACCENT_HEX : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    {acknowledged && <Check className="w-3.5 h-3.5" style={{ color: '#0a0a0a' }} strokeWidth={3} />}
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-[12.5px] leading-snug"
                      style={{ fontFamily: "'Inter', sans-serif", color: text, fontWeight: 500 }}
                    >
                      {isGift ? 'I understand this gift delivery is final' : 'I understand this transfer is final'}
                    </p>
                    <p
                      className="text-[11.5px] mt-0.5 leading-snug"
                      style={{ fontFamily: "'Inter', sans-serif", color: textDim }}
                    >
                      {isGift ? "The recipient will receive a secure claim link that can't be recalled." : "The ticket will leave my wallet and can't be recalled."}
                    </p>
                  </div>
                </AppButton>

                {/* Security note */}
                <div className="flex items-center gap-2 px-1">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textFaint }} strokeWidth={2} />
                  <p
                    className="text-[10.5px] leading-snug"
                    style={{ fontFamily: "'Inter', sans-serif", color: textFaint }}
                  >
                    Verified by Digis · {isGift ? 'secure gift delivery' : 'end-to-end ownership transfer'}
                  </p>
                </div>

                {sendError && (
                  <div className="flex items-start gap-2 rounded-2xl px-3.5 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} strokeWidth={2} />
                    <p className="text-[12px] leading-snug" style={{ fontFamily: "'Inter', sans-serif", color: '#ef4444' }}>
                      {sendError}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="sent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center text-center pt-8 pb-6"
              >
                <div className="relative w-24 h-24 mb-6">
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: `1.5px solid rgba(${ACCENT},0.18)` }}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: [0.8, 1.8], opacity: [0.7, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8 }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ background: accentSoft, border: `1px solid ${accentBorder}` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.1 }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 12, delay: 0.35 }}
                    >
                      <Check className="w-10 h-10" style={{ color: accentText }} strokeWidth={2} />
                    </motion.div>
                  </motion.div>
                </div>

                <motion.h2
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="text-[24px] font-light tracking-[-0.3px]"
                  style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: text }}
                >
                  {isGift ? 'Gift sent' : 'Ticket sent'}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="mt-2 text-[13.5px] max-w-[300px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: textDim }}
                >
                  {isGift ? 'Your gift for ' : 'We sent '}
                  <span style={{ color: text, fontWeight: 500 }}>{recipientName}</span>{' '}
                  {isGift ? `is on its way via phone.` : `a secure claim link via phone.`}
                </motion.p>

                {/* Account holders get an in-app notification too */}
                {recipientHasAccount && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.62 }}
                    className="mt-4 w-full max-w-[300px] rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{ background: accentSoft, border: `1px solid ${accentBorder}` }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isDark ? 'rgba(214,249,5,0.14)' : 'rgba(214,249,5,0.25)' }}>
                      <Bell className="w-4 h-4" style={{ color: accentText }} strokeWidth={2} />
                    </div>
                    <p className="text-left text-[12px] leading-snug" style={{ fontFamily: "'Inter', sans-serif", color: text }}>
                      They have a Digis account — a notification is already waiting in their app.
                    </p>
                  </motion.div>
                )}

                {/* Shareable link */}
                {shareLink && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mt-4 w-full max-w-[300px]"
                  >
                    <p className="text-left text-[10px] tracking-[1.4px] uppercase mb-1.5" style={{ fontFamily: "'Inter', sans-serif", color: textFaint, fontWeight: 600 }}>
                      Or share the link
                    </p>
                    <AppButton
                      onClick={handleCopy}
                      className="w-full rounded-2xl px-3.5 py-3 flex items-center gap-3"
                      style={{ background: surfaceSoft, border: `1px solid ${borderSoft}` }}
                    >
                      <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: textDim }} strokeWidth={1.8} />
                      <span className="flex-1 text-left text-[12px] truncate" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
                        {shareLink.replace(/^https?:\/\//, '')}
                      </span>
                      {copied ? (
                        <span className="flex items-center gap-1 text-[11px] flex-shrink-0" style={{ fontFamily: "'Inter', sans-serif", color: accentText, fontWeight: 600 }}>
                          <Check className="w-3.5 h-3.5" strokeWidth={2.4} /> Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] flex-shrink-0" style={{ fontFamily: "'Inter', sans-serif", color: text, fontWeight: 600 }}>
                          <Copy className="w-3.5 h-3.5" strokeWidth={2} /> Copy
                        </span>
                      )}
                    </AppButton>
                  </motion.div>
                )}

                <AppButton
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="mt-7 px-7 py-3 rounded-full"
                  style={{
                    background: ACCENT_HEX,
                    color: '#0a0a0a',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    letterSpacing: '0.4px',
                  }}
                >
                  Done
                </AppButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA */}
        {step < 3 && (
          <div className="px-6 pt-3 pb-6">
            <AppButton
              whileTap={{ scale: canProceed ? 0.98 : 1 }}
              onClick={() => {
                if (!canProceed || sending) return;
                if (step === 2) handleSend();
                else setStep(step + 1);
              }}
              disabled={!canProceed || sending}
              className="w-full py-3.5 rounded-full flex items-center justify-center gap-2 relative overflow-hidden"
              style={{
                ...(canProceed
                  ? { background: ACCENT_HEX, color: '#0a0a0a' }
                  : disabledSurface(isDark)),
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 13.5,
                letterSpacing: '0.3px',
                transition: 'background 0.25s, color 0.25s',
                cursor: canProceed && !sending ? 'pointer' : 'not-allowed',
              }}
            >
              {sending ? (
                <motion.div
                  className="w-4 h-4 rounded-full"
                  style={{ border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#0a0a0a' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <>
                  <span>{step === 2 ? (isGift ? 'Send gift' : 'Send ticket') : step === 1 ? (isGift ? 'Review gift' : 'Review delivery') : 'Continue'}</span>
                  {step === 2 ? (
                    <Send className="w-4 h-4" strokeWidth={2.2} />
                  ) : (
                    <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                  )}
                </>
              )}
            </AppButton>

            {step === 2 && (
              <div className="flex items-center gap-1.5 justify-center mt-3">
                <AlertTriangle className="w-3 h-3" style={{ color: textFaint }} strokeWidth={2} />
                <p
                  className="text-[10.5px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: textFaint }}
                >
                  {isGift ? "Gift deliveries are final and can't be reversed." : "Transfers are final and can't be reversed."}
                </p>
              </div>
            )}
          </div>
        )}
        </div>
      </motion.div>
    </motion.div>
  );
}


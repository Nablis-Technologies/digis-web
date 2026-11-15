import { AnimatePresence, motion } from 'motion/react';
import { Gift, Phone } from 'lucide-react';
import { readableCategoryRgb } from '@/lib/categoryColors';
import { disabledSurface } from '@/lib/ui/disabledStyles';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassEdge } from '@/lib/ui/glass';
import { Money } from '@/lib/money';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from './DetailsStep';

export function ReviewStep({
  event, ticketType, ticketLevel, quantity, setQuantity,
  basePrice, isDark, hasSeats, selectedSeats = [],
  isGift, setIsGift,
  giftRecipientPhone, setGiftRecipientPhone,
  giftNote, setGiftNote,
  giftErrors,
  children,
}: any) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textDim = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,46,0.4)';
  const cardBg = isDark ? 'rgba(217,255,0,0.06)' : 'rgba(214,249,5,0.05)';

  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.08)';

  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{ background: cardBg, backdropFilter: 'blur(30px)' }}>
      <GlassReflection isDark={isDark} />
      <div className="relative z-10">

      {/* Event row — compact thumb + meta */}
      <div className="flex gap-3 p-4">
        {event.image && (
          <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0">
            <img src={event.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {event.category && (
            <span className="inline-block text-[9px] tracking-[1.5px] uppercase mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: `rgb(${readableCategoryRgb(event.category, isDark)})` }}>
              {event.category}
            </span>
          )}
          <h3 className="text-[15px] font-light leading-tight mb-1.5 truncate"
            style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
            {event.name}
          </h3>
          <p className="text-[11px] leading-tight"
            style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
            {event.date} · {event.time}
          </p>
          <p className="text-[11px] leading-tight truncate"
            style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
            {event.venue}
          </p>
        </div>
      </div>

      <div className="h-px mx-4" style={{ background: divider }} />

      {/* Ticket + quantity */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] tracking-[2px] uppercase mb-1"
            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? '#d6f905' : '#0a0a0a' }}>
            {ticketLevel}
          </p>
          <h4 className="text-[14px] font-light leading-tight mb-0.5 truncate"
            style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
            {ticketType}
          </h4>
          <p className="text-[10px]" style={{ color: textDim, fontFamily: "'Inter', sans-serif" }}>
            {Money.fromMinor(basePrice, "ETB").format()} each
            {!hasSeats && ' · set quantity for your whole group here'}
          </p>
        </div>
        {hasSeats ? (
          <div className="flex-shrink-0 text-right">
            <p className="text-[9px] tracking-[2px] uppercase mb-0.5" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
              {quantity} {quantity === 1 ? 'seat' : 'seats'}
            </p>
            <p className="text-[13px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
              {Money.fromMinor(basePrice * quantity, "ETB").format()}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full p-1 flex-shrink-0"
            style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(26,26,46,0.05)' }}>
            <Stepper symbol="−" disabled={quantity <= 1 || isGift}
              onClick={() => setQuantity(Math.max(1, quantity - 1))} isDark={isDark} />
            <span className="text-[14px] min-w-[18px] text-center font-light"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
              {isGift ? 1 : quantity}
            </span>
            <Stepper symbol="+" disabled={quantity >= 8 || isGift}
              onClick={() => setQuantity(Math.min(8, quantity + 1))} isDark={isDark} />
          </div>
        )}
      </div>

      {/* Gift Toggle & Recipient Details */}
      {setIsGift && (
        <>
          <div className="h-px mx-4" style={{ background: divider }} />
          <div className="p-4 space-y-4">
            <div
              onClick={() => setIsGift(!isGift)}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <Checkbox
                checked={Boolean(isGift)}
                onCheckedChange={(checked) => setIsGift(Boolean(checked))}
              />
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4" style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} />
                <span className="text-[13px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: textPrimary }}>
                  Send this ticket as a gift
                </span>
              </div>
            </div>

            <AnimatePresence>
              {isGift && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3.5 pt-1 overflow-hidden"
                >
                  <p className="text-[11px] leading-relaxed ml-1" style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
                    We'll deliver a direct claim link to the recipient via SMS once your payment is confirmed. Gift tickets are limited to 1 per recipient.
                  </p>

                  <Field
                    icon={<Phone className="w-4 h-4" />}
                    label="Recipient Phone Number *"
                    type="tel"
                    placeholder="+251 91 123 4567"
                    value={giftRecipientPhone || ''}
                    onChange={(v: string) => setGiftRecipientPhone?.(v)}
                    error={giftErrors?.recipientPhone}
                    isDark={isDark}
                  />

                  <Field
                    icon={<Gift className="w-4 h-4" />}
                    label="Gift Note (Optional)"
                    textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Add a personal message to your gift..."
                    value={giftNote || ''}
                    onChange={(v: string) => setGiftNote?.(v)}
                    error={giftErrors?.note}
                    helpText={`${(giftNote || '').length}/500`}
                    isDark={isDark}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {hasSeats && selectedSeats.length > 0 && (
        <>
          <div className="h-px mx-4" style={{ background: divider }} />
          <div className="p-4">
            <p className="text-[9px] tracking-[2px] uppercase mb-2" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
              Your seats
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedSeats.map((s: any) => (
                <span key={s.id} className="px-2 py-1 rounded-lg text-[11px]"
                  style={{ fontFamily: "'Inter', sans-serif", background: isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.15)', color: isDark ? '#f4ff66' : '#3a4600' }}>
                  {s.section} · {s.row}{s.seat}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Backend-required buyer consents (Phase 3) — rendered inside the review card. */}
      {children}

      </div>
    </div>
  );
}


function Stepper({ symbol, onClick, disabled, isDark }: any) {
  return (
    <AppButton
      whileTap={{ scale: disabled ? 1 : 0.85 }}
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 rounded-lg flex items-center justify-center disabled:cursor-not-allowed text-[16px] leading-none"
      style={{
        ...(disabled
          ? disabledSurface(isDark)
          : {
              background: isDark ? 'rgba(217,255,0,0.15)' : 'rgba(214,249,5,0.1)',
              ...glassEdge(isDark),
              color: isDark ? '#f4ff66' : '#0a0a0a',
            }),
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {symbol}
    </AppButton>
  );
}

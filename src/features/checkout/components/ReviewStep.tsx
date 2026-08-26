import { motion } from 'motion/react';
import { readableCategoryRgb } from '@/lib/categoryColors';
import { disabledSurface } from '@/lib/ui/disabledStyles';
import { AppButton } from '@/components/primitives/AppButton';

export function ReviewStep({
  event, ticketType, ticketLevel, quantity, setQuantity,
  basePrice, isDark, hasSeats, selectedSeats = [],
}: any) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const textDim = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,26,46,0.4)';
  const cardBg = isDark ? 'rgba(217,255,0,0.06)' : 'rgba(214,249,5,0.05)';
  const cardBorder = isDark ? 'rgba(217,255,0,0.15)' : 'rgba(214,249,5,0.12)';

  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,26,46,0.08)';

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: cardBorder, background: cardBg, backdropFilter: 'blur(30px)' }}>

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
            ETB {basePrice.toLocaleString()} each
          </p>
        </div>
        {hasSeats ? (
          <div className="flex-shrink-0 text-right">
            <p className="text-[9px] tracking-[2px] uppercase mb-0.5" style={{ fontFamily: "'Inter', sans-serif", color: textDim }}>
              {quantity} {quantity === 1 ? 'seat' : 'seats'}
            </p>
            <p className="text-[13px] font-light" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
              ETB {(basePrice * quantity).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full p-1 flex-shrink-0"
            style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(26,26,46,0.05)' }}>
            <Stepper symbol="−" disabled={quantity <= 1}
              onClick={() => setQuantity(Math.max(1, quantity - 1))} isDark={isDark} />
            <span className="text-[14px] min-w-[18px] text-center font-light"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
              {quantity}
            </span>
            <Stepper symbol="+" disabled={quantity >= 8}
              onClick={() => setQuantity(Math.min(8, quantity + 1))} isDark={isDark} />
          </div>
        )}
      </div>

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
              border: `1px solid ${isDark ? 'rgba(217,255,0,0.25)' : 'rgba(214,249,5,0.2)'}`,
              color: isDark ? '#f4ff66' : '#0a0a0a',
            }),
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {symbol}
    </AppButton>
  );
}

import { motion } from 'motion/react';
import { ArrowRight, Gift } from 'lucide-react';
import type { TicketTier } from '@/types';
import { Money } from '@/lib/money';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

export function PurchaseBar({
  isDark,
  selectedTicket,
  selectedTicketType,
  selectedTicketAccentReadable,
  totalPrice,
  minPrice,
  onGift,
  onPurchase,
  label,
  hideGift = false,
}: {
  isDark: boolean;
  selectedTicket: TicketTier | null;
  selectedTicketType: string | null;
  selectedTicketAccentReadable: string;
  totalPrice: number;
  minPrice: number;
  onGift: () => void;
  onPurchase: () => void;
  /** CTA copy override (e.g. resale). Defaults to Buy Now / Get Tickets. */
  label?: string;
  /** Gifting is a primary-sale action; resale listings hide it. */
  hideGift?: boolean;
}) {
  const priceAmount = Money.fromMinor(selectedTicketType ? totalPrice : minPrice, "ETB").formatNumber();
  const priceCurrency = "ETB";

  return (
    <div className="relative flex items-center gap-3 min-[380px]:gap-4 overflow-hidden px-4 min-[380px]:px-5 py-3 rounded-2xl"
      style={{
        // Translucent night/paper tint — blur alone over a transparent fill
        // lets page text ghost through behind the price.
        background: isDark ? 'rgba(8,9,11,0.62)' : 'rgba(255,255,255,0.72)',
        backdropFilter: isDark
          ? 'blur(60px) saturate(2) brightness(1.15)'
          : 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: isDark
          ? 'blur(60px) saturate(2) brightness(1.15)'
          : 'blur(24px) saturate(1.8)',
      }}>
      <GlassReflection isDark={isDark} />
      <div className="relative z-10 flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 78 }}>
        <span className="text-[9px] tracking-[1.8px] uppercase leading-none mb-1.5"
          style={{
            fontFamily: "'Inter', sans-serif",
            color: selectedTicket
              ? `rgba(${selectedTicketAccentReadable}, ${isDark ? 0.85 : 0.95})`
              : isDark
                ? 'rgba(255,255,255,0.4)'
                : 'rgba(0,0,0,0.4)',
            fontWeight: selectedTicket ? 700 : 500,
            maxWidth: 78,
          }}>
          {selectedTicketType ? 'Total' : 'From'}
        </span>
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="font-light leading-none tracking-[-0.3px] whitespace-nowrap truncate"
            style={{
              fontFamily: "'Zalando Sans Expanded', sans-serif",
              color: isDark ? '#fff' : '#1a1a1a',
              fontVariantNumeric: 'tabular-nums',
              fontSize: (selectedTicketType ? totalPrice : minPrice) >= 1000 ? 14 : 18,
            }}>
            {priceAmount}
          </span>
          <span className="text-[10px] tracking-[1px] flex-shrink-0"
            style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }}>
            {priceCurrency}
          </span>
        </div>
      </div>
      <div className="relative z-10 w-px self-stretch my-1"
        style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
      {!hideGift && (
      <AppButton whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
        onClick={onGift}
        aria-label="Gift this ticket"
        title="Gift this ticket"
        className="relative z-10 h-10 w-10 min-[380px]:w-auto rounded-xl flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 min-[380px]:px-[10px]"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        }}>
        <Gift className="w-[16px] h-[16px]"
          style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }} strokeWidth={1.75} />
        <span className="hidden min-[380px]:inline text-[12px] tracking-[0.3px]"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
          }}>
          Gift
        </span>
      </AppButton>
      )}
      <AppButton whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onPurchase}
        className="relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)',
          color: '#0a0a0a',
        }}>
        <span className="text-[12px] sm:text-[14px] tracking-[0.2px] sm:tracking-[0.3px]"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
          {label ?? (selectedTicketType ? 'Buy Now' : 'Get Tickets')}
        </span>
        <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
      </AppButton>
    </div>
  );
}

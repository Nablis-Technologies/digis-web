import { motion } from 'motion/react';
import { ArrowRight, Check, Share2 } from 'lucide-react';
import type { RsvpStatus } from '@/types';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';

interface RsvpBarProps {
  rsvpStatus: RsvpStatus;
  isDark: boolean;
  onShare: () => void;
  onRegister: () => void;
  onPurchase: () => void;
}

export function RsvpBar({ rsvpStatus, isDark, onShare, onRegister, onPurchase }: RsvpBarProps) {
  return (
    <div className="relative flex items-center gap-3 overflow-hidden px-4 py-3 rounded-2xl"
      style={{
        background: isDark ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(60px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(60px) saturate(1.6)',
      }}>
      <GlassReflection isDark={isDark} />
      <div className="relative z-10 flex flex-col min-w-0 flex-shrink-0">
        <span className="text-[9px] tracking-[1.8px] uppercase leading-none mb-1.5"
          style={{ fontFamily: "'Inter', sans-serif", color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
          Status
        </span>
        <span className="text-[14px] leading-none tracking-[-0.2px]"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
          {rsvpStatus === 'going' ? 'Going' : rsvpStatus === 'maybe' ? 'Maybe' : rsvpStatus === 'declined' ? 'Declined' : 'Free'}
        </span>
      </div>

      <div className="relative z-10 w-px self-stretch my-1"
        style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />

      <AppButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
        onClick={onShare}
        aria-label="Share event"
        className="relative z-10 w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer flex-shrink-0"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        }}>
        <GlassReflection isDark={isDark} />
        <Share2 className="relative z-10 w-[17px] h-[17px]"
          style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }} strokeWidth={1.75} />
      </AppButton>

      <AppButton whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        onClick={() => {
          if (rsvpStatus === 'going') {
            onPurchase();
          } else {
            onRegister();
          }
        }}
        className="relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 cursor-pointer"
        style={{
          background: rsvpStatus === 'going'
            ? (isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.1)')
            : (isDark ? 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)' : '#0a0a0a'),
          color: rsvpStatus === 'going'
            ? (isDark ? '#d6f905' : '#0a0a0a')
            : (isDark ? '#0a0a0a' : '#fff'),
          border: rsvpStatus === 'going'
            ? `1px solid ${isDark ? 'rgba(214,249,5,0.3)' : 'rgba(214,249,5,0.25)'}`
            : 'none',
        }}>
        {rsvpStatus === 'going' ? (
          <>
            <Check className="w-4 h-4" strokeWidth={2.5} />
            <span className="text-[14px] tracking-[0.3px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
              You're In · View Details
            </span>
          </>
        ) : (
          <>
            <span className="text-[14px] tracking-[0.3px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
              Confirm RSVP
            </span>
            <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
          </>
        )}
      </AppButton>
    </div>
  );
}

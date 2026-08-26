import { motion } from 'motion/react';
import { ArrowRight, Check, Hourglass, Lock } from 'lucide-react';
import type { Event, InviteUnlockState } from '@/types';
import { disabledSurface } from '@/lib/ui/disabledStyles';
import { AppButton } from '@/components/primitives/AppButton';

interface InviteOnlyBarProps {
  event: Event;
  inviteUnlock: InviteUnlockState;
  inviteRsvpConfirmed: boolean;
  isDark: boolean;
  onCheckout: () => void;
  onConfirmRsvp: () => void;
  onPurchase: () => void;
}

export function InviteOnlyBar({ event, inviteUnlock, inviteRsvpConfirmed, isDark, onCheckout, onConfirmRsvp, onPurchase }: InviteOnlyBarProps) {
  return (
    <div className="relative flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: isDark ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(60px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(60px) saturate(1.6)',
        border: `1px solid ${inviteUnlock.unlocked
          ? `rgba(${isDark ? '214,249,5' : '214,249,5'},0.25)`
          : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
      }}>
      <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: inviteUnlock.unlocked
              ? (inviteUnlock.method === 'waitlist'
                ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
                : (isDark ? '#d6f905' : '#d6f905'))
              : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
            border: inviteUnlock.unlocked && inviteUnlock.method !== 'waitlist'
              ? 'none'
              : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          }}>
          {inviteUnlock.method === 'waitlist' ? (
            <Hourglass className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }} strokeWidth={2} />
          ) : inviteUnlock.unlocked ? (
            <Check className="w-4 h-4" style={{ color: isDark ? '#000' : '#fff' }} strokeWidth={2.5} />
          ) : (
            <Lock className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }} strokeWidth={2} />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] tracking-[1.8px] uppercase leading-none mb-1"
            style={{ fontFamily: "'Inter', sans-serif",
              color: inviteUnlock.unlocked && inviteUnlock.method !== 'waitlist'
                ? (isDark ? '#d6f905' : '#0a0a0a')
                : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)') }}>
            {inviteUnlock.method === 'waitlist'
              ? 'Waitlisted'
              : inviteUnlock.unlocked ? 'Access Granted' : (event.inviteWaitlistOnly ? 'At Capacity' : 'Locked')}
          </span>
          <span className="text-[13px] leading-none"
            style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: isDark ? '#fff' : '#1a1a1a', fontWeight: 300 }}>
            {inviteUnlock.method === 'waitlist'
              ? 'Holding spot'
              : inviteUnlock.unlocked
                ? (event.inviteOnlyPaid ? 'Choose access' : (inviteRsvpConfirmed ? 'Confirmed' : 'Confirm'))
                : 'Private event'}
          </span>
        </div>
      </div>
      <div className="w-px self-stretch my-1"
        style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
      <AppButton whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        onClick={() => {
          if (inviteUnlock.method === 'waitlist') return;
          if (!inviteUnlock.unlocked) return;
          if (event.inviteOnlyPaid) {
            onCheckout();
          } else if (!inviteRsvpConfirmed) {
            onConfirmRsvp();
          } else {
            onPurchase();
          }
        }}
        disabled={!inviteUnlock.unlocked || inviteUnlock.method === 'waitlist'}
        className="relative flex flex-1 items-center justify-center gap-2 rounded-xl py-3 cursor-pointer disabled:cursor-not-allowed"
        style={{
          background: !inviteUnlock.unlocked || inviteUnlock.method === 'waitlist'
            ? disabledSurface(isDark).background
            : (event.inviteOnlyPaid || !inviteRsvpConfirmed
              ? (isDark ? 'linear-gradient(135deg, #d6f905 0%, #d9ff00 100%)' : '#0a0a0a')
              : (isDark ? 'rgba(214,249,5,0.12)' : 'rgba(214,249,5,0.1)')),
          color: !inviteUnlock.unlocked || inviteUnlock.method === 'waitlist'
            ? disabledSurface(isDark).color
            : (event.inviteOnlyPaid || !inviteRsvpConfirmed
              ? (isDark ? '#0a0a0a' : '#fff')
              : (isDark ? '#d6f905' : '#5a6b00')),
          border: inviteUnlock.unlocked && inviteUnlock.method !== 'waitlist' && !event.inviteOnlyPaid && inviteRsvpConfirmed
            ? `1px solid ${isDark ? 'rgba(214,249,5,0.3)' : 'rgba(214,249,5,0.25)'}`
            : 'none',
        }}>
        {inviteUnlock.method === 'waitlist' ? (
          <><Hourglass className="w-3.5 h-3.5" strokeWidth={2} /><span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Waiting for a Seat</span></>
        ) : !inviteUnlock.unlocked ? (
          <><Lock className="w-3.5 h-3.5" strokeWidth={2} /><span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>{event.inviteWaitlistOnly ? 'Join Waitlist Above' : 'Unlock to Continue'}</span></>
        ) : event.inviteOnlyPaid ? (
          <><span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Get Access</span><ArrowRight className="w-4 h-4" strokeWidth={2.25} /></>
        ) : inviteRsvpConfirmed ? (
          <><Check className="w-4 h-4" strokeWidth={2.5} /><span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Confirmed · Details</span></>
        ) : (
          <><span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Confirm Attendance</span><ArrowRight className="w-4 h-4" strokeWidth={2.25} /></>
        )}
      </AppButton>
    </div>
  );
}
